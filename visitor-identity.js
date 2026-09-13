(() => {
  'use strict';
  const nicknameKey = 'minihompy.visitor.nickname.v1';
  function normalizeNickname(value) {
    if (typeof value !== 'string') throw new TypeError('닉네임을 입력해 주세요.');
    const name = value.trim();
    if (!name || [...name].length > 20 || /[\u0000-\u001f\u007f]/u.test(name)) {
      throw new Error('닉네임은 줄바꿈 없이 1~20자로 입력해 주세요.');
    }
    return name;
  }
  // The SDK client is supplied only after the project is configured.
  // Nicknames are display preferences, never credentials or role claims.
  window.createMinihompyIdentity = (client, storage) => {
    if (!client?.auth || typeof client.rpc !== 'function') throw new TypeError('Supabase client required');
    if (storage === undefined) {
      try { storage = window.localStorage; } catch { storage = null; }
    }
    let nickname = '';
    let pendingVisitor = null;
    try {
      const saved = storage?.getItem(nicknameKey);
      if (saved) nickname = normalizeNickname(saved);
    } catch { /* A blocked store must not prevent reading the homepage. */ }
    async function current() {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) return { role: 'reader', userId: null };
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error('사용자 확인에 실패했습니다.');
      const { data: admin, error: adminError } = await client.rpc('is_minihompy_admin');
      if (adminError) throw adminError;
      return { role: admin === true ? 'admin' : 'visitor', userId: data.user.id };
    }
    return Object.freeze({
      getNickname() { return nickname; },
      setNickname(value) {
        nickname = normalizeNickname(value);
        try { storage?.setItem(nicknameKey, nickname); return Boolean(storage); }
        catch { return false; }
      },
      current,
      // Create an identity only on explicit writing, never on page load.
      ensureVisitor() {
        if (pendingVisitor) return pendingVisitor;
        pendingVisitor = (async () => {
          const identity = await current();
          if (identity.userId) return identity;
          const { error } = await client.auth.signInAnonymously();
          if (error) throw error;
          const visitor = await current();
          if (!visitor.userId) throw new Error('방문자 식별 정보를 만들지 못했습니다.');
          return visitor;
        })().finally(() => { pendingVisitor = null; });
        return pendingVisitor;
      },
    });
  };
})();
