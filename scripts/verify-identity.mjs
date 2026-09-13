import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const scope = { window: {} };
runInNewContext(await readFile(new URL('../visitor-identity.js', import.meta.url), 'utf8'), scope);
const create = scope.window.createMinihompyIdentity;
const values = new Map();
const store = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
let user = null, admin = false, signins = 0, failure = null;
const client = {
  auth: {
    async getSession() { return { data: { session: user ? { user } : null } }; },
    async getUser() { return { data: { user }, error: failure }; },
    async signInAnonymously(options) {
      assert.equal(options, undefined);
      signins++;
      user = { id: 'visitor-id', user_metadata: { role: 'admin' } };
      return { error: null };
    },
  },
  async rpc(name) { assert.equal(name, 'is_minihompy_admin'); return { data: admin, error: null }; },
};
const identity = create(client, store);
assert.equal((await identity.current()).role, 'reader');
assert.equal(signins, 0);
assert(identity.setNickname('  손님  '));
assert.equal(create(client, store).getNickname(), '손님');
assert.throws(() => identity.setNickname(' '));
assert.throws(() => identity.setNickname('가'.repeat(21)));
assert.throws(() => identity.setNickname('이름\n변경'));
const [a, b] = await Promise.all([identity.ensureVisitor(), identity.ensureVisitor()]);
assert.equal(signins, 1);
assert.equal(a.userId, b.userId);
assert.equal(a.role, 'visitor', 'User metadata cannot grant admin');
identity.setNickname('관리자');
assert.equal((await identity.current()).role, 'visitor');
assert.equal((await identity.ensureVisitor()).userId, 'visitor-id');
assert.equal(signins, 1);
admin = true;
assert.equal((await identity.current()).role, 'admin');
failure = new Error('Network unavailable');
await assert.rejects(identity.current(), /Network unavailable/);
await assert.rejects(identity.ensureVisitor(), /Network unavailable/);
assert.equal(signins, 1, 'Never replace an identity after verification failure');
const blocked = create(client, { getItem() { throw Error(); }, setItem() { throw Error(); } });
assert.equal(blocked.getNickname(), '');
assert.equal(blocked.setNickname('손님'), false);
assert.equal(blocked.getNickname(), '손님');
console.log('PASS: nickname, persistence failure, lazy anonymous identity without CAPTCHA, deduplication, verified admin lookup, fail closed.');
