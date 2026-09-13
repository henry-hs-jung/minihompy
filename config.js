// Runtime DB settings only. Personal values live in minihompy_settings.
(() => {
  'use strict';
  let snapshot = null, status = 'loading', error = '', pending = null;
  window.MINIHOMPY_CONFIG = null;
  function publish() { window.dispatchEvent(new CustomEvent('minihompy:settings', { detail: { status, error } })); }
  function accept(row) {
    if (!row?.payload || !Number.isInteger(row.revision)) throw new Error('설정 데이터가 올바르지 않습니다.');
    window.MinihompySettings.validate(row.payload);
    snapshot = row;
    window.MINIHOMPY_CONFIG = structuredClone(row.payload);
    status = 'ready'; error = ''; publish();
  }
  window.MinihompySettings = Object.freeze({
    get status() { return status; }, get error() { return error; },
    get snapshot() { return snapshot ? structuredClone(snapshot) : null; },
    validate(value) {
      const fields = [['page','browserTitle',1,80],['page','title',1,120],['profile','name',1,20],['profile','introduction',0,2000],['profile','detail',0,80],['home','roomMessage',0,500],['home','friendsMessage',0,500]];
      for (const [section, key, min, max] of fields) {
        const text = value?.[section]?.[key];
        if (typeof text !== 'string' || [...text.trim()].length < min || [...text.trim()].length > max) throw new Error(`${section}.${key} 항목을 확인해 주세요.`);
      }
      for (const key of ['today','total']) if (!Number.isInteger(value.home[key]) || value.home[key] < 0 || value.home[key] > 2147483647) throw new Error('방문 수는 0~2147483647의 정수로 입력해 주세요.');
      if (!Array.isArray(value.home.recentEmptyLines) || value.home.recentEmptyLines.length !== 3 || value.home.recentEmptyLines.some(line => typeof line !== 'string' || [...line].length > 500)) throw new Error('최근게시물 문구를 확인해 주세요.');
      const ids = new Set(), known = ['home','profile','diary','music','photos','gallery','board','video','guestbook'];
      if (!Array.isArray(value.menus) || value.menus.length > 9) throw new Error('메뉴 설정을 확인해 주세요.');
      for (const menu of value.menus) {
        if (!menu || !known.includes(menu.id) || ids.has(menu.id) || typeof menu.visible !== 'boolean' || typeof menu.label !== 'string' || !menu.label.trim() || [...menu.label.trim()].length > 20) throw new Error('메뉴 이름과 중복 여부를 확인해 주세요.');
        ids.add(menu.id);
      }
    },
    load() {
      if (pending) return pending;
      status = 'loading'; error = ''; publish();
      pending = (async () => {
        try {
          const result = await window.MinihompyBackend.getClient('visitor').from('minihompy_settings').select('payload,revision').eq('id', 1).maybeSingle();
          if (result.error) throw result.error;
          if (!result.data) throw new Error('DB 설정이 없습니다.');
          accept(result.data);
        } catch {
          status = 'error'; error = '설정을 불러오지 못했습니다. DB 설정과 연결 상태를 확인해 주세요.';
          snapshot = null; window.MINIHOMPY_CONFIG = null; publish();
        } finally { pending = null; }
      })();
      return pending;
    },
    async save(payload, revision) {
      this.validate(payload);
      const client = window.MinihompyBackend.getClient('admin');
      if ((await window.createMinihompyIdentity(client).current()).role !== 'admin') throw new Error('관리자 로그인이 필요합니다.');
      const result = await client.from('minihompy_settings').update({ payload }).eq('id', 1).eq('revision', revision).select('payload,revision').maybeSingle();
      if (result.error) throw new Error('저장 결과를 확인하지 못했습니다. 입력은 유지됩니다. 다시 불러와 저장 여부를 확인해 주세요.');
      if (!result.data) throw new Error('설정이 다른 곳에서 변경되었거나 권한이 없습니다. 다시 불러온 뒤 수정해 주세요.');
      accept(result.data);
      return structuredClone(result.data);
    },
  });
})();
