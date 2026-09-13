// Public visual samples only. No writing, storage, or permission handling yet.
window.MINIHOMPY_BOARD = {
  pageSize: 10,
  folders: [
    { id: 'notes', label: '자유게시판', description: '소소한 생각을 담아두는 곳' },
    { type: 'divider' },
    { id: 'memo', label: '기억해 두기', description: '다시 꺼내 보고 싶은 이야기' },
    { id: 'empty', label: '새 폴더', description: '' },
  ],
  posts: [
    ['오랜만에 남기는 글', '오늘은 오래된 사진들을 꺼내 보았다.\n\n잊고 있던 순간들이 생각보다 선명했다.\n가끔은 이렇게 천천히 돌아보는 시간도 좋은 것 같다.'],
    ['주말 오후', '창문을 열고 음악을 들었다.\n별일 없는 하루도 기록해 두기.'],
    ['다시 듣고 싶은 노래', '한동안 잊고 지냈던 노래를 다시 찾았다.'],
    ['짧은 메모', '서두르지 말고 하나씩.'],
    ['비가 오던 날', '우산을 챙겨 나왔더니 비가 그쳤다.'],
    ['친구와 나눈 이야기', '다음에 만나면 오늘의 이야기를 이어 가기로 했다.'],
    ['산책길에서', '늘 걷던 길을 조금 돌아서 걸었다.'],
    ['책갈피', '좋아하는 문장이 있는 페이지를 접어 두었다.'],
    ['오늘의 기록', '작은 일도 오래 지나면 추억이 되겠지.'],
    ['한 장의 엽서', '짧은 안부가 반가웠다.'],
    ['처음 남기는 인사', '반가워요.\n이곳에 조금씩 이야기를 남겨 보려고 합니다.'],
    ['기억하고 싶은 순간', '평범해서 더 오래 기억하고 싶은 하루.'],
  ].map(([title, body], index) => ({
    id: `board-${index + 1}`,
    folder: index === 11 ? 'memo' : 'notes',
    title,
    body,
    author: null, // Falls back to config.profile.name.
    date: `2007.06.${String(24 - index).padStart(2, '0')} 13:11`,
    views: 0,
  })),
};
