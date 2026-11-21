// Service worker: la app abre sin conexión. Subir VERSION cada vez que cambien los archivos.
const VERSION = 'mw-v2.1.1';
const ARCHIVOS = [
  './', 'index.html', 'css/styles.css', 'manifest.webmanifest',
  'js/app.js', 'js/api.js', 'js/evaluar.js', 'js/iconos.js', 'js/almacen.js',
  'icons/icono.svg', 'icons/icono-192.png', 'icons/icono-512.png', 'fonts/inter.woff2',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Solo se cachean los archivos propios. El clima siempre va a la red;
// si no hay conexión, la app usa el último pronóstico guardado.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copia = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copia));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r ?? caches.match('index.html'))),
  );
});
