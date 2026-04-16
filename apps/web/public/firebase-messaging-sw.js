/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// We need to fetch the env vars. Wait, service workers don't have access to process.env.
// We must register the Service Worker with matching Config during the client code registration.
// However, the easiest way is to use a URLSearchParams strategy when registering the SW or initialize inside the client.
// Actually, firebase-messaging will find this file. So we can just wait for config.
// The config can be injected when it's built or we can initialize it with data passed via postMessage.

// Since we cannot use process.env here directly, we'll listen for a message to initialize it.
// Alternatively, setting it via query params is common in Next.js:
// `navigator.serviceWorker.register('/firebase-messaging-sw.js?firebaseConfig=...')`

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

let messaging = null;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INIT_FIREBASE') {
    if (!firebase.apps.length) {
      firebase.initializeApp(event.data.firebaseConfig);
      messaging = firebase.messaging();

      messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Received background message ', payload);
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
          body: payload.notification.body,
          icon: '/android-chrome-192x192.png',
          badge: '/favicon-32x32.png',
          data: {
            link: payload.fcmOptions?.link || payload.data?.link || '/'
          }
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
      });
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data.link || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
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
