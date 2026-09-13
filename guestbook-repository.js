(() => {
  'use strict';
  const checked = result => { if (result.error) throw result.error; return result; };
  const session = window.MinihompyVisitorSession;
  const context = session.context;
  function validate(draft) {
    if (!draft.body.trim() || [...draft.body].length > 5000) throw new Error('방명록은 1~5,000자 이내로 작성해 주세요.');
    if (!['public', 'private'].includes(draft.visibility)) throw new Error('공개 설정을 확인해 주세요.');
  }
  window.MinihompyGuestbookRepository = Object.freeze({
    context,
    nickname: session.nickname,
    async list(ctx, page, size) {
      const result = checked(await ctx.client.from('guestbook_posts').select('*', { count: 'exact' })
        .order('created_at', { ascending: false }).order('id', { ascending: false }).range((page - 1) * size, page * size - 1));
      return { items: result.data, count: result.count };
    },
    async save(draft) {
      validate(draft);
      const ctx = await session.writer(draft.name, !draft.revision);
      const fields = { body: draft.body, visibility: draft.visibility };
      const existing = async () => checked(await ctx.client.from('guestbook_posts').select('*').eq('id', draft.id).maybeSingle()).data;
      const same = row => row && row.author_id === ctx.userId && row.body === fields.body && row.visibility === fields.visibility;
      if (!draft.revision) {
        const prior = await existing();
        if (prior) { if (same(prior)) return prior; throw new Error('이미 저장된 방명록입니다. 다시 조회해 주세요.'); }
      }
      const query = draft.revision
        ? ctx.client.from('guestbook_posts').update(fields).eq('id', draft.id).eq('author_id', ctx.userId).eq('revision', draft.revision)
        : ctx.client.from('guestbook_posts').insert({ ...fields, id: draft.id, author_name: ctx.authorName });
      const row = checked(await query.select('*').maybeSingle()).data;
      if (row) return row;
      const prior = await existing(); if (same(prior)) return prior;
      throw new Error('다른 곳에서 변경되었거나 수정 권한이 없는 방명록입니다.');
    },
    async makePrivate(post) {
      const ctx = await context();
      if (!ctx.userId) throw new Error('작성자 또는 관리자만 변경할 수 있습니다.');
      const row = checked(await ctx.client.from('guestbook_posts').update({ visibility: 'private' }).eq('id', post.id).eq('revision', post.revision).select('*').maybeSingle()).data;
      if (!row) throw new Error('방명록이 변경되었거나 권한이 없습니다. 다시 조회해 주세요.');
    },
    async remove(post) {
      const ctx = await context();
      if (!ctx.userId) throw new Error('작성자 또는 관리자만 삭제할 수 있습니다.');
      const row = checked(await ctx.client.from('guestbook_posts').delete().eq('id', post.id).eq('revision', post.revision).select('id').maybeSingle()).data;
      if (!row) throw new Error('방명록이 변경되었거나 삭제 권한이 없습니다. 다시 조회해 주세요.');
    },
  });
})();
