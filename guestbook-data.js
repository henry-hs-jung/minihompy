// Public fixture data only. "private" previews the authorized reading appearance;
// it does not provide access control and must never contain actual private text.
window.MINIHOMPY_GUESTBOOK = {
  posts: [
    { id: 'visit-86', number: 86, name: '김민수', date: '2009.04.28 16:05', visibility: 'public',
      text: '오랜만에 들렀다 가요~\n잘 지내고 있지? ^^',
      comments: [{ name: '정현식', text: '응 잘 지내! 자주 놀러 와~', date: '2009.04.28 18:20' }] },
    { id: 'visit-85', number: 85, name: '이지은', date: '2009.04.26 03:15', visibility: 'private',
      text: '오랜만이라 더 반갑다\n그동안 잘 지냈지?\n오늘도 좋은 하루 보내세요!!\n\n다음에도 이렇게 가끔 놀러 올게 ^^',
      comments: [{ name: '정현식', text: '나도 반가워~\n우리 시간 맞으면 한번 만나자 :)', date: '2009.04.27 02:06' }] },
    { id: 'visit-84', number: 84, name: '박수진', date: '2009.04.24 10:47', visibility: 'public',
      text: '사진 잘 보고 가요.\n오늘도 좋은 하루 보내!', comments: [] },
  ],
};
