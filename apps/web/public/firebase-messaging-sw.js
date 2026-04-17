/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-messaging-compat.js');

// Firebase public config — these are NEXT_PUBLIC_ values, safe to embed.
// Self-initializing so background messages work even when no client page is open.
const firebaseConfig = {
  apiKey: 'AIzaSyB-qEtd6MNb-cHkTPtXROXGQbuUC-mtvDk',
  authDomain: 'ipe-24.firebaseapp.com',
  projectId: 'ipe-24',
  storageBucket: 'ipe-24.firebasestorage.app',
  messagingSenderId: '538496451475',
  appId: '1:538496451475:web:7b349e771a84ffa791de66',
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message:', payload);

  const notificationTitle = payload.notification?.title || 'IPE-24 Update';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    data: {
      link: payload.fcmOptions?.link || payload.data?.link || '/',
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === link && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(link);
      }
    })
  );
});
