begin;
-- Reuse the same client-generated primary key when a save response is lost.
-- Existing admin-only INSERT RLS and immutable UPDATE grants are unchanged.
grant insert (id) on public.board_posts to authenticated;
commit;
