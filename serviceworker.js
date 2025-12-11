CACHE_NAME = 'v1'; // actualizar nro cada vez que actualizo otros archivos para que los recargue

const ASSETS = [];


// INSTALACIÓN
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});


// ACTIVACIÓN (limpia cachés viejos)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// FETCH
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if ( req.mode === 'navigate' || url.pathname.endsWith('.html') ) {
    event.respondWith(
      fetch(req)
        .then(resp => {
          const copy = resp.clone();

          // 1) borrar SOLO caches de HTML
          caches.keys().then(keys => {
            keys.forEach(k => {
              if (k.startsWith('html-')) caches.delete(k);
            });
          });

          // 2) crear nuevo cache HTML y guardar este archivo
          const newCache = 'html-' + Date.now();
          caches.open(newCache).then(c => c.put(req, copy));

          return resp;
        })
        .catch(() => {
          // Si está offline → devolver HTML más reciente
          return caches.match(req)
            .then(r => r || caches.match('./fallback.html'));
        })
    );
    return;
  }

});
