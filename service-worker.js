const CACHE_NAME = "schema-ht26-v16";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=16",
  "./theme-init.js?v=16",
  "./app.js?v=16",
  "./schedule-data.js?v=16",
  "./manifest.json?v=16",
  "./icons/header-logo.png?v=16",
  "./icons/icon-192.png?v=16",
  "./icons/icon-512.png?v=16",
  "./icons/icon-maskable-192.png?v=16",
  "./icons/icon-maskable-512.png?v=16",
  "./icons/apple-touch-icon.png?v=16"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (["script", "style", "worker", "manifest"].includes(event.request.destination)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const update = fetch(event.request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => cached);
      return cached || update;
    })
  );
});
