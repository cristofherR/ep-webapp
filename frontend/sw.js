// sw.js — Service Worker (PWA).
// Estrategia: NETWORK-FIRST para el shell de la app (siempre lo último),
// con la caché como respaldo offline. La API (/api/) nunca se cachea.
const CACHE = "ea-mel-v27";
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest",
  "./styles/tokens.css", "./styles/app.css",
  "./src/app.js", "./src/router.js", "./src/nav.js", "./src/api.js", "./src/store.js", "./src/views.js",
  "./icons/icon.svg",
  "./assets/logo-ancash-blanco.png", "./assets/portada-login.jpg", "./assets/portada-login-pc.jpg",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL).catch(() => {}))  // si algún archivo falta, no bloquear
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;      // solo mismo origen
  if (url.pathname.includes("/api/")) return;           // API: siempre red

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
  );
});
