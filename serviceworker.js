CACHE_NAME = 'v2'; // actualizar nro cada vez que actualizo otros archivos para que los recargue

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


  // CSS de fonts.googleapis.com → network-first
  const GOOGLE_FONTS_CSS_CACHE = 'gf-css';

  self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (url.origin === 'https://fonts.googleapis.com') {
      event.respondWith(
        caches.open(GOOGLE_FONTS_CSS_CACHE).then(cache =>
          fetch(event.request)
            .then(resp => {
              cache.put(event.request, resp.clone());
              return resp;
            })
            .catch(() => cache.match(event.request))
        )
      );
      return;
    }
  });

  // archivos .woff2 desde fonts.gstatic.com → cache-first
  const GOOGLE_FONTS_FILES_CACHE = 'gf-files';

  self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (url.origin === 'https://fonts.gstatic.com') {
      event.respondWith(
        caches.open(GOOGLE_FONTS_FILES_CACHE).then(cache =>
          cache.match(event.request).then(cached => {
            if (cached) return cached;

            return fetch(event.request).then(resp => {
              cache.put(event.request, resp.clone());
              return resp;
            });
          })
        )
      );
      return;
    }
  });

});
