import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

console.log('=== Starting Visitor Identity Client Unit Tests ===\n');

// Load visitor-identity.js in mock browser environment
const scriptContent = await readFile(new URL('../visitor-identity.js', import.meta.url), 'utf8');

function createMockWindow(overrides = {}) {
  const listeners = new Map();
  const storageMap = new Map();

  const mockStorage = {
    getItem: key => (storageMap.has(key) ? storageMap.get(key) : null),
    setItem: (key, val) => storageMap.set(key, String(val)),
    removeItem: key => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };

  const win = {
    crypto: {
      randomUUID: () => 'test-attempt-uuid-1234',
    },
    location: {
      pathname: '/minihompy/',
      search: '',
      hash: '#/home',
      replace: url => { win.location.lastRedirect = url; },
    },
    history: {
      replaceState: (_state, _title, url) => { win.location.hash = url; },
    },
    sessionStorage: mockStorage,
    localStorage: mockStorage,
    addEventListener: (type, fn) => {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    dispatchEvent: event => {
      const fns = listeners.get(event.type) || [];
      for (const fn of fns) fn(event);
      return true;
    },
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
    document: { readyState: 'complete' },
    ...overrides,
  };

  const context = {
    window: win,
    location: win.location,
    history: win.history,
    sessionStorage: win.sessionStorage,
    localStorage: win.localStorage,
    document: win.document,
    CustomEvent: win.CustomEvent,
    fetch: globalThis.fetch,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    AbortController: globalThis.AbortController,
  };

  runInNewContext(scriptContent, context);
  return win;
}

// --- 1. Backwards Compatibility with existing createMinihompyIdentity ---
console.log('1. Testing backwards compatibility for local anonymous identity...');

const mockWin1 = createMockWindow();
const localIdentity = mockWin1.createMinihompyIdentity({
  auth: {
    async getSession() { return { data: { session: null }, error: null }; },
    async getUser() { return { data: { user: null }, error: null }; },
    async signInAnonymously() { return { error: null }; },
  },
  async rpc() { return { data: false, error: null }; },
});

assert.equal(typeof localIdentity.getNickname, 'function');
assert.equal(typeof localIdentity.setNickname, 'function');
localIdentity.setNickname('테스트손님');
assert.equal(localIdentity.getNickname(), '테스트손님');
assert.throws(() => localIdentity.setNickname(' '));

console.log('   ✓ Local createMinihompyIdentity functions intact.');

// --- 2. Shared Identity: Disabled Config Check ---
console.log('2. Testing disabled configuration...');

const mockWin2 = createMockWindow();
const sharedIdentityDisabled = mockWin2.createMinihompySharedIdentity({ enabled: false });
await sharedIdentityDisabled.resolve();
assert.equal(sharedIdentityDisabled.state.status, 'anonymous');
assert.equal(sharedIdentityDisabled.state.visitor, null);

console.log('   ✓ Disabled config gracefully defaults to anonymous without network.');

// --- 3. Shared Identity: Health Check Failure & Timeout Fallback ---
console.log('3. Testing central healthcheck failure and fallback...');

const mockWin3 = createMockWindow();
// Mock fetch that fails health check
mockWin3.fetch = async () => { throw new Error('Connection refused'); };

const sharedIdentityDown = mockWin3.createMinihompySharedIdentity({
  enabled: true,
  siteId: 'site-test-1',
  centralUrl: 'http://central-down.local',
  healthTimeoutMs: 50,
});

await sharedIdentityDown.resolve();
assert.equal(sharedIdentityDown.state.status, 'error');
assert.equal(sharedIdentityDown.state.visitor, null);
assert.equal(mockWin3.location.lastRedirect, undefined, 'Must NOT redirect when central is down');

console.log('   ✓ Central server failure safely falls back to error/anonymous with 0 redirects.');

// --- 4. Shared Identity: First Visit Redirect & Guard Setup ---
console.log('4. Testing first visit redirect and sessionStorage guard setup...');

const mockWin4 = createMockWindow();
// Mock fetch returning healthy 204 for /health
mockWin4.fetch = async url => {
  if (url.includes('/health')) return { ok: true, status: 204 };
  throw new Error('Unexpected fetch ' + url);
};

const sharedIdentityVisit = mockWin4.createMinihompySharedIdentity({
  enabled: true,
  siteId: 'site-a-uuid',
  centralUrl: 'http://central.local',
  healthTimeoutMs: 500,
});

await sharedIdentityVisit.resolve();
assert(mockWin4.location.lastRedirect.includes('/visit?site_id=site-a-uuid'));
assert(mockWin4.location.lastRedirect.includes('attempt_id=test-attempt-uuid-1234'));
assert(mockWin4.location.lastRedirect.includes('return_path=%2Fminihompy%2F%23%2Fhome'));

// Guard must be recorded in sessionStorage
const savedGuard = JSON.parse(mockWin4.sessionStorage.getItem('minihompy.identity.redirect.v1:site-a-uuid'));
assert.equal(savedGuard.attempt_id, 'test-attempt-uuid-1234');
assert.equal(savedGuard.status, 'checking');

console.log('   ✓ Initial visit verified: health checked, guard set, top-level redirected to /visit.');

// --- 5. Shared Identity: Redirect Loop Prevention ---
console.log('5. Testing redirect loop prevention...');

// When user returns but still has checking guard and no token, do NOT redirect again!
const mockWin5 = createMockWindow();
mockWin5.sessionStorage.setItem(
  'minihompy.identity.redirect.v1:site-a-uuid',
  JSON.stringify({ attempt_id: 'prior-attempt', status: 'checking', started_at: Date.now() })
);
mockWin5.fetch = async () => { throw new Error('Fetch should not be called'); };

const sharedIdentityLoopPrevent = mockWin5.createMinihompySharedIdentity({
  enabled: true,
  siteId: 'site-a-uuid',
  centralUrl: 'http://central.local',
});

await sharedIdentityLoopPrevent.resolve();
assert.equal(sharedIdentityLoopPrevent.state.status, 'anonymous');
assert.equal(mockWin5.location.lastRedirect, undefined, 'Must NOT loop when guard exists');

console.log('   ✓ Loop prevention guard prevents repetitive redirects.');

// --- 6. Shared Identity: Return with Token & Route Restoration ---
console.log('6. Testing return with token and internal route restoration...');

const mockWin6 = createMockWindow();
// URL contains returning fragment
mockWin6.location.hash = '#vt=mock-visitor-token-abc&path=%23%2Fboard';
mockWin6.sessionStorage.setItem(
  'minihompy.identity.redirect.v1:site-a-uuid',
  JSON.stringify({ attempt_id: 'test-attempt-xyz', status: 'checking', started_at: Date.now() })
);

let eventReceived = null;
mockWin6.addEventListener('minihompy:visitor-identity', ev => {
  eventReceived = ev.detail;
});

// Mock resolve endpoint
mockWin6.fetch = async (url, options) => {
  if (url.includes('/visits/resolve')) {
    const body = JSON.parse(options.body);
    assert.equal(body.visit_token, 'mock-visitor-token-abc');
    assert.equal(body.site_id, 'site-a-uuid');
    return {
      ok: true,
      json: async () => ({
        status: 'identified',
        attempt_id: 'test-attempt-xyz',
        profile: {
          id: 'common-user-uuid-1',
          handle: 'henry',
          display_name: '헨리',
          homepage_url: 'https://henry-phd-finance.github.io/minihompy/',
        },
      }),
    };
  }
  throw new Error('Unexpected fetch: ' + url);
};

const sharedIdentityReturn = mockWin6.createMinihompySharedIdentity({
  enabled: true,
  siteId: 'site-a-uuid',
  centralUrl: 'http://central.local',
});

await sharedIdentityReturn.resolve();
assert.equal(sharedIdentityReturn.state.status, 'identified');
assert.equal(sharedIdentityReturn.state.visitor.display_name, '헨리');
assert.equal(eventReceived.status, 'identified');
assert.equal(eventReceived.visitor.handle, 'henry');

// Guard must be cleared
assert.equal(mockWin6.sessionStorage.getItem('minihompy.identity.redirect.v1:site-a-uuid'), null);

// History hash restored to original route (#/board), fragment token cleaned up
assert.equal(mockWin6.location.hash, '#/board');

console.log('   ✓ Return flow verified: token resolved, guard cleared, internal route (#/board) restored.');

// --- 7. Shared Identity: UI Element Binding & Display Updates ---
console.log('7. Testing UI element binding (search-bar visitor display & button toggle)...');

const mockElements = {
  '#visitor-display': { hidden: true },
  '#visitor-name': { textContent: '' },
  '#visitor-auth-toggle': {
    textContent: '로그인',
    title: '방문자 로그인',
    listeners: {},
    addEventListener(type, fn) { this.listeners[type] = fn; },
    click() { if (this.listeners.click) this.listeners.click(); },
  },
};

const mockWin7 = createMockWindow({
  document: {
    readyState: 'complete',
    querySelector: selector => mockElements[selector] || null,
  },
});

const sharedIdentityUI = mockWin7.createMinihompySharedIdentity({
  enabled: true,
  siteId: 'site-a-uuid',
  centralUrl: 'http://central.local',
});

// Initially anonymous
assert.equal(mockElements['#visitor-display'].hidden, true);
assert.equal(mockElements['#visitor-auth-toggle'].textContent, '로그인');

// Simulate identified visitor event
mockWin7.dispatchEvent(new mockWin7.CustomEvent('minihompy:visitor-identity', {
  detail: {
    status: 'identified',
    visitor: { display_name: '홍길동', handle: 'hong' },
  },
}));

assert.equal(mockElements['#visitor-display'].hidden, false);
assert.equal(mockElements['#visitor-name'].textContent, '홍길동');
assert.equal(mockElements['#visitor-auth-toggle'].textContent, '로그아웃');
assert.equal(mockElements['#visitor-auth-toggle'].title, '방문자 로그아웃');

// Simulate anonymous visitor event
mockWin7.dispatchEvent(new mockWin7.CustomEvent('minihompy:visitor-identity', {
  detail: {
    status: 'anonymous',
    visitor: null,
  },
}));

assert.equal(mockElements['#visitor-display'].hidden, true);
assert.equal(mockElements['#visitor-name'].textContent, '');
assert.equal(mockElements['#visitor-auth-toggle'].textContent, '로그인');
assert.equal(mockElements['#visitor-auth-toggle'].title, '방문자 로그인');

console.log('   ✓ UI element binding verified: visitor name shown/hidden, toggle button text/title updated.');

console.log('\n=============================================================');
console.log('ALL CLIENT VISITOR IDENTITY TESTS PASSED (100% SUCCESS)');
console.log('=============================================================\n');
