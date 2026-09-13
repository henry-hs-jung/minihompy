(() => {
  'use strict';
  const bucket = 'minihompy-profile';
  const reader = () => window.MinihompyBackend.getClient('visitor');
  const checked = result => { if (result.error) throw result.error; return result.data; };
  const fields = ['image_path', 'image_alt', 'image_width', 'name', 'paragraphs'];
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  async function writer() {
    const client = window.MinihompyBackend.getClient('admin');
    if ((await window.createMinihompyIdentity(client).current()).role !== 'admin') throw new Error('관리자 로그인이 필요합니다.');
    return client;
  }
  window.MinihompyProfileRepository = Object.freeze({
    url(path) { return !path || path === 'assets/photos/lake.jpg' ? path : reader().storage.from(bucket).getPublicUrl(path).data.publicUrl; },
    async load() {
      const row = checked(await reader().from('minihompy_profile').select('*').eq('id', 1).maybeSingle());
      if (!row) throw new Error('프로필 데이터가 없습니다.');
      return row;
    },
    validate(row) {
      if (typeof row.image_path !== 'string' || (row.image_path !== '' && row.image_path !== 'assets/photos/lake.jpg' && !/^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/.test(row.image_path))) throw new Error('사진 경로를 확인해 주세요.');
      if (typeof row.image_alt !== 'string' || [...row.image_alt].length > 200 || !Number.isInteger(row.image_width) || row.image_width < 1 || row.image_width > 300) throw new Error('사진 설명과 표시 폭(1~300)을 확인해 주세요.');
      if (row.name !== null && (typeof row.name !== 'string' || !row.name.trim() || [...row.name.trim()].length > 20)) throw new Error('이름은 1~20자로 입력해 주세요.');
      if (row.paragraphs !== null && (!Array.isArray(row.paragraphs) || row.paragraphs.length > 100 || row.paragraphs.some(text => typeof text !== 'string') || row.paragraphs.reduce((n, text) => n + [...text].length, 0) > 10000)) throw new Error('소개는 100문단, 10,000자 이내로 입력해 주세요.');
    },
    filePath(file) {
      if (!extensions[file.type] || file.size === 0 || file.size > 6291456) throw new Error('JPG, PNG, WEBP, GIF 사진을 6MB 이하로 선택해 주세요.');
      return `${crypto.randomUUID()}.${extensions[file.type]}`;
    },
    async upload(path, file) {
      const storage = (await writer()).storage.from(bucket);
      const result = await storage.upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' });
      if (result.error && String(result.error.statusCode) === '409') {
        const remote = checked(await storage.download(path));
        const a = new Uint8Array(await remote.arrayBuffer()), b = new Uint8Array(await file.arrayBuffer());
        if (a.length === b.length && a.every((byte, i) => byte === b[i])) return;
      }
      checked(result);
    },
    async save(row) {
      this.validate(row);
      const client = await writer();
      const value = Object.fromEntries(fields.map(key => [key, row[key]]));
      const result = await client.from('minihompy_profile').update(value).eq('id', 1).eq('revision', row.revision).select('*').maybeSingle();
      if (result.error) throw new Error('저장 결과를 확인하지 못했습니다. 입력은 유지됩니다. 다시 저장하거나 불러와 확인해 주세요.');
      if (result.data) return result.data;
      const current = await this.load();
      if (fields.every(key => JSON.stringify(current[key]) === JSON.stringify(value[key]))) return current;
      throw new Error('다른 곳에서 프로필이 변경되었습니다. 다시 불러온 뒤 수정해 주세요.');
    },
    async cleanup(path) {
      if (!path || path === 'assets/photos/lake.jpg') return;
      checked(await (await writer()).storage.from(bucket).remove([path]));
    },
  });
})();
