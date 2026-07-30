const cacheName = 'pyumo-housework-v1';

export const manifest = {
  id: '/',
  name: '家事分担管理',
  short_name: '家事分担',
  description: '家事と共有TODOを管理するアプリ',
  lang: 'ja',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#f4f7f6',
  theme_color: '#4a90e2',
  icons: [
    { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
  ],
};

export const appIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#4a90e2"/>
  <path fill="#fff" d="M145 120h222c20 0 37 17 37 37v206c0 20-17 37-37 37H145c-20 0-37-17-37-37V157c0-20 17-37 37-37Zm0 38v204h222V158H145Zm40 45h34v34h-34v-34Zm0 72h34v34h-34v-34Zm0 72h34v34h-34v-34Zm68-140h80v27h-80v-27Zm0 72h80v27h-80v-27Zm0 72h80v27h-80v-27Z"/>
  <path fill="#f5a623" d="m340 304 23 23 54-62 25 22-78 88-49-48 25-23Z"/>
</svg>`;

export const offlinePage = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#4a90e2"><title>オフライン | 家事分担管理</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f7f6;color:#333;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.card{max-width:320px;margin:24px;padding:28px;border-radius:16px;background:#fff;box-shadow:0 4px 16px #0001;text-align:center}a{display:inline-block;margin-top:16px;padding:10px 16px;border-radius:8px;background:#4a90e2;color:#fff;text-decoration:none;font-weight:700}</style>
</head><body><main class="card"><h1>オフラインです</h1><p>接続が回復したら、もう一度お試しください。</p><a href="/">再読み込み</a></main></body></html>`;

export const serviceWorker = `const CACHE_NAME = '${cacheName}';
const PRECACHE_URLS = [
  '/', '/todo.html', '/todoist.html', '/offline.html', '/manifest.webmanifest', '/icon.svg',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
  'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/menu.svg',
  'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/x.svg',
  'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/trash-2.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin && url.origin !== 'https://cdn.jsdelivr.net') return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return response;
    }).catch(() => caches.match(request).then(response => response || caches.match('/offline.html'))));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match(request).then(response => response || new Response(JSON.stringify({ error: 'オフラインです' }), { status: 503, headers: { 'Content-Type': 'application/json' } }))));
    return;
  }

  event.respondWith(caches.match(request).then(response => response || fetch(request).then(networkResponse => {
    if (networkResponse.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse.clone()));
    return networkResponse;
  })));
});`;
