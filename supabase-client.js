(() => {
  'use strict';
  const clients = new Map();
  window.MinihompyBackend = Object.freeze({
    // Instantiate on explicit use, not while rendering the static homepage.
    getClient(kind = 'visitor') {
      if (!['visitor', 'admin'].includes(kind)) throw new TypeError('Unknown identity kind');
      if (!clients.has(kind)) {
        const { url, publishableKey } = window.MINIHOMPY_SUPABASE;
        clients.set(kind, window.supabase.createClient(url, publishableKey, {
          auth: {
            storageKey: `minihompy-${new URL(url).hostname}-${kind}-v1`,
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
          },
        }));
      }
      return clients.get(kind);
    },
  });
})();
