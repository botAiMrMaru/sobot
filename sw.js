/* App-shell cache only. The sealed feed is never cached. */
const V = 'sobot-v8';
const SHELL = ['./', 'index.html', 'sobot.css', 'config.js', 'feed.js', 'markets_x.js', 'world.js', 'live.js', 'chi.js', 'play.js', 'teach.js', 'chi9.js', 'app.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'fonts/geist.woff2', 'fonts/geistmono.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== 'GET') return;
  if (/feed\.json$/i.test(u.pathname)) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
