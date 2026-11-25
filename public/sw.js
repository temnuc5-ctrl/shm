// Service worker SHM Rapports : fonctionnement hors ligne du site web.
// Augmenter VERSION à chaque changement de logo ou de ressource non versionnée.
const VERSION = "shm-v1";

const SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/shm-logo.png",
  "/assets/logos/shm-safi.png",
  "/assets/logos/achbal.png",
  "/assets/logos/kachafa.png",
  "/assets/logos/motakadim.png",
  "/assets/logos/jowala.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Jamais de cache pour l'API, les fonctions Netlify ou les requêtes externes.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/.netlify/")) return;

  // Pages : réseau d'abord (dernière version), sinon l'application en cache.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html")),
    );
    return;
  }

  // Fichiers statiques : cache d'abord, puis réseau (et mise en cache).
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          const type = response.headers.get("content-type") || "";
          // On ne met pas en cache la page HTML de secours renvoyée à la place d'une image manquante.
          if (response.ok && !type.includes("text/html")) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
