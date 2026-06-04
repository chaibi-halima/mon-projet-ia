// Nom du cache local
const CACHE_NAME = 'ai-writer-v1';
// Sous Vite avec index.html à la racine, on met juste la racine en cache
const urlsToCache = ['/'];

// 1. Installation : mise en cache des actifs statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// 2. Interception des requêtes : Stratégie Network-First avec Fallback Cache
self.addEventListener('fetch', (event) => {
  // On ne met pas en cache les requêtes vers l'API Symfony (pour toujours avoir les vrais articles récents)
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la requête réseau réussit, on met à jour le cache statique
        if (event.request.method === 'GET') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Si le réseau échoue (hors-ligne), on cherche dans le cache
        return caches.match(event.request);
      })
  );
});