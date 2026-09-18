(() => {
  'use strict';
  const client = window.MinihompyBackend.getClient('admin');
  const identity = window.createMinihompyIdentity(client);
  const toggle = document.querySelector('#admin-auth-toggle');
  const dialog = document.querySelector('.admin-dialog');
  const form = document.querySelector('#admin-login-form');
  const email = document.querySelector('#admin-email');
  const password = document.querySelector('#admin-password');
  const message = document.querySelector('.admin-auth-message');
  const submit = document.querySelector('#admin-submit');
  const close = document.querySelector('#admin-close');
  let state = Object.freeze({ role: 'reader', userId: null });
  let busy = false;
  let generation = 0;
  function publish(next) {
    state = Object.freeze({ role: next.role === 'admin' ? 'admin' : 'reader', userId: next.role === 'admin' ? next.userId : null });
    toggle.textContent = state.role === 'admin' ? '로그아웃' : '관리자';
    toggle.title = state.role === 'admin' ? '관리자 로그아웃' : '관리자 로그인';
    document.documentElement.dataset.identity = state.role;
    window.dispatchEvent(new CustomEvent('minihompy:identity', { detail: state }));
  }
  function setBusy(value) {
    busy = value;
    toggle.disabled = submit.disabled = close.disabled = value;
    email.disabled = password.disabled = value;
    form.setAttribute('aria-busy', String(value));
  }
  async function refresh() {
    const current = ++generation;
    try {
      const verified = await identity.current();
      if (current === generation) publish(verified);
    } catch {
      if (current === generation) publish({ role: 'reader' });
    }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    ++generation;
    setBusy(true);
    message.textContent = '확인 중입니다.';
    try {
      const { error } = await client.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
      password.value = '';
      if (error) {
        message.textContent = '로그인하지 못했습니다. 입력 정보와 연결 상태를 확인해 주세요.';
        return;
      }
      const verified = await identity.current();
      if (verified.role !== 'admin') {
        await client.auth.signOut({ scope: 'local' });
        publish({ role: 'reader' });
        message.textContent = '관리자로 등록된 계정이 아닙니다.';
        return;
      }
      publish(verified);
      dialog.close();
    } catch {
      publish({ role: 'reader' });
      message.textContent = '관리자 권한을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    } finally {
      password.value = '';
      setBusy(false);
    }
  });
  toggle.addEventListener('click', async () => {
    if (busy) return;
    message.textContent = '';
    if (state.role !== 'admin') {
      dialog.showModal();
      email.focus();
      return;
    }
    ++generation;
    setBusy(true);
    publish({ role: 'reader' });
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch {
      message.textContent = '로그아웃을 완료하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.';
      await refresh();
      dialog.showModal();
    } finally { setBusy(false); }
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => { password.value = ''; });
  // Defer SDK calls outside the Auth callback to avoid its session lock.
  client.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT') { ++generation; publish({ role: 'reader' }); }
    else if (!busy) setTimeout(() => { if (!busy) void refresh(); }, 0);
  });
  window.addEventListener('online', () => { if (!busy) void refresh(); });
  window.MinihompyAdmin = Object.freeze({ get state() { return state; }, refresh });
  void refresh();

  // URL 쿼리 파라미터 ?admin=login 감지 시 관리자 로그인 창 자동 오픈
  try {
    if (new URLSearchParams(location.search).get('admin') === 'login') {
      setTimeout(() => {
        if (state.role !== 'admin') {
          dialog.showModal();
          email.focus();
        }
      }, 0);
    }
  } catch { /* Ignore URL parsing errors */ }
})();
