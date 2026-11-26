const CACHE_NAME = 'charlie-pwa-v13';

const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './assets/art/keyart-landscape.jpg',
  './assets/art/keyart-portrait.jpg',
  './assets/art/charlie-portrait.jpg',
  './assets/art/cutscene-micro.jpg',
  './assets/art/cutscene-forest.jpg',
  './assets/art/cutscene-city.jpg',
  './assets/art/cutscene-planets.jpg',
  './assets/art/cutscene-cosmos.jpg',
  './assets/art/scene-intro-window.jpg',
  './assets/art/scene-intro-plunge.jpg',
  './assets/art/scene-quantum-break.jpg',
  './assets/art/scene-forest-friends.jpg',
  './assets/art/scene-city-rise.jpg',
  './assets/art/scene-planetary-dance.jpg',
  './assets/art/scene-nebula-glide.jpg',
  './assets/art/scene-star-call.jpg',
  './assets/art/scene-goodnight-window.jpg',
  './src/audio.js',
  './src/blob.js',
  './src/cutscenes.js',
  './src/entities.js',
  './src/game.js',
  './src/particles.js',
  './src/scales.js',
  './src/story.js',
  './src/skins/cosmicSkins.js',
  './src/skins/macroSkins.js',
  './src/skins/microSkins.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isIconRequest(url) {
  return url.pathname.includes('/icons/') || url.pathname.endsWith('.png');
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    throw new Error('Offline and not cached');
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isIconRequest(url)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});
