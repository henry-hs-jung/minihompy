(() => {
  'use strict';
  function fitText() {
    for (const name of document.querySelectorAll('.relationship-slot [data-config="profile.name"]')) {
      name.classList.remove('relationship-name-clipped');
      const range = document.createRange();
      range.selectNodeContents(name);
      const frame = name.closest('.minihompy');
      const scale = frame.getBoundingClientRect().width / frame.offsetWidth;
      name.classList.toggle('relationship-name-clipped', range.getBoundingClientRect().width > 14 * scale);
    }
    for (const element of document.querySelectorAll('.homepage-title, .profile-status, .profile-name, .recent-empty, .room-balloon > span, .friends-prompt > [data-config], .tab-label, .visit-count > span')) {
      element.classList.toggle('text-clipped', element.scrollWidth > element.clientWidth);
      if (!element.matches('.recent-empty')) element.title = element.textContent;
    }
  }
  function scheduleFit() {
    // Measure after insertion, then again once any newly requested glyph fonts load.
    fitText();
    document.fonts.ready.then(fitText);
  }
  window.addEventListener('resize', scheduleFit);
  window.MinihompyContent = {
    fit: scheduleFit,
    apply(root = document) {
      const config = window.MINIHOMPY_CONFIG;
      if (!config) {
        for (const element of root.querySelectorAll('[data-config]')) { element.textContent = ''; element.removeAttribute('title'); }
        return;
      }
      const read = path => path.split('.').reduce((value, key) => value?.[key], config);
      for (const element of root.querySelectorAll('[data-config]')) {
        const value = read(element.dataset.config);
        const isCounter = ['home.today', 'home.total'].includes(element.dataset.config);
        const valid = isCounter ? Number.isSafeInteger(value) && value >= 0 : typeof value === 'string';
        if (valid) {
          element.textContent = String(value);
          element.title = String(value);
        } else {
          console.warn(`Invalid config value: ${element.dataset.config}; keeping current text.`);
        }
      }
      const recentEmpty = root.querySelector('.recent-empty');
      if (!recentEmpty) {
        if (root === document) scheduleFit();
        return;
      }
      const lines = config.home?.recentEmptyLines;
      if (Array.isArray(lines) && lines.every(line => typeof line === 'string')) {
        const content = document.createDocumentFragment();
        lines.slice(0, 3).forEach((line, index) => {
          if (index > 0) content.append(document.createElement('br'));
          content.append(document.createTextNode(line));
        });
        recentEmpty.replaceChildren(content);
        recentEmpty.title = lines.join('\n');
      } else {
        console.warn('Invalid config value: home.recentEmptyLines; keeping current text.');
      }
      if (root === document) scheduleFit();
    },
  };
})();
