(() => {
  'use strict';
  window.MINIHOMPY_DIARY = {
    initialDate: '2009-04-28',
    folders: [
      { id: 'daily', label: '나의 다이어리' },
      { id: 'memories', label: '소중한 기억들' },
      { id: 'notes', label: '마음에 담은 말' },
    ],
    entries: [
      { id: 'spring', folder: 'daily', date: '2009-04-28', time: '15:45', weather: '맑음', body: '오랜만에 햇살이 참 좋았다.\n\n창문을 열어 두고 한참을 앉아 있었다.\n어디선가 바람에 실려 오는 봄 냄새.\n\n별일 없이 지나가는 하루도\n이렇게 적어 두면 조금은 특별해지는 것 같다.\n\n오늘의 기억은 여기에.', comments: [{ name: '친구', text: '이런 날에는 같이 산책하자 :)', date: '04.28 18:20' }] },
      { id: 'evening', folder: 'daily', date: '2009-04-28', time: '22:10', weather: '맑음', body: '하루를 마무리하며.\n내일도 오늘처럼 좋은 날이었으면.', comments: [] },
      { id: 'walk', folder: 'daily', date: '2009-04-27', time: '17:30', weather: '맑음', body: '조금 천천히 걸어도 괜찮은 오후.', image: 'assets/photos/forest.jpg', alt: '햇살이 들어오는 숲', comments: [] },
      { id: 'march', folder: 'daily', date: '2009-03-31', time: '21:00', weather: '흐림', body: '3월의 마지막 날.\n새로운 달을 기다리며.', comments: [] },
      { id: 'memory', folder: 'memories', date: '2009-04-12', time: '12:40', weather: '맑음', body: '오래된 사진을 꺼내 보았다.\n함께 웃던 순간들이 생각난다.', comments: [] },
    ],
  };
})();
