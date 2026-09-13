(() => {
  'use strict';
  // Flat folders and optional separators, not nested categories.
  window.MINIHOMPY_PHOTOS = {
    pageSize: 2,
    folders: [
      { type: 'divider', label: '나' },
      { id: 'daily', label: '일상', description: '소중한 추억이 담겨 있는 저의 일상이예요.' },
      { id: 'travel', label: '여행', description: '여행에서 만난 풍경들.' },
      { type: 'divider', label: '☆' },
      { id: 'scenery', label: '풍경 이야기', description: '오래 바라보고 싶은 순간.' },
      { id: 'friends', label: '친구들♡', description: '함께여서 좋았던 날들.' },
      { id: 'favorites', label: '좋아하는 것', description: '작고 소중한 것들.' },
      { type: 'divider', label: '지난 사진' },
      { id: 'memories', label: '추억 속으로', description: '사진으로 남겨 둔 기억.' },
    ],
    posts: [
      { id: 'lake-day', folder: 'daily', title: '한 장의 추억', date: '2007.10.16 20:17', image: 'assets/photos/lake.jpg', alt: '산과 호숫가의 작은 집이 물에 비치는 풍경', caption: '잠깐 멈춰 서서 바라본 풍경.\n사진 한 장에 오늘을 담아 둔다.', comments: [{ name: '친구', text: '사진 너무 좋다. 다음에는 같이 가자!', date: '10.17 12:04' }] },
      { id: 'forest-day', folder: 'daily', title: '햇살이 좋았던 오후', date: '2007.10.12 15:32', image: 'assets/photos/forest.jpg', alt: '초록 숲 사이로 햇살이 비치는 모습', caption: '아무 생각 없이 걷기 좋았던 날.', comments: [] },
      { id: 'lake-memory', folder: 'daily', title: '다시 꺼내 본 사진', date: '2007.09.28 22:10', image: 'assets/photos/lake.jpg', alt: '호수에 비친 산과 작은 집', caption: '그날의 조용한 공기가 생각난다.', comments: [] },
      { id: 'travel-lake', folder: 'travel', title: '여행의 첫날', date: '2007.09.24 18:20', image: 'assets/photos/lake.jpg', alt: '산 아래 잔잔한 호수', caption: '오래 기억하고 싶은 곳.', comments: [] },
      { id: 'green', folder: 'scenery', title: '초록빛', date: '2007.09.20 13:41', image: 'assets/photos/forest.jpg', alt: '햇살이 들어오는 초록 숲', caption: '빛이 참 예쁘다.', comments: [] },
    ],
  };
})();
