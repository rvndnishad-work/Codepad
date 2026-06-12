// Self-unregistering service worker to clean up stale service workers from other localhost projects
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.registration.unregister();
});
