(() => {
  'use strict';
  // Screen definitions are independent of menu visibility and ordering.
  window.MINIHOMPY_VIEWS = Object.create(null);
  const pendingViews = [
    ['music', '쥬크박스'],
    ['gallery', '갤러리'],
    ['video', '동영상'],
  ];
  for (const [id, label] of pendingViews) {
    window.MINIHOMPY_VIEWS[id] = {
      label,
      showScrollbar: false,
      createLeft: () => document.createDocumentFragment(),
      createMain: () => document.createDocumentFragment(),
    };
  }
})();
