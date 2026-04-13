self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()

  event.waitUntil(
    self.registration.showNotification(data.notification.title, {
      body: data.notification.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      data: { link: data.webpush?.fcmOptions?.link },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = event.notification.data?.link ?? '/'
  event.waitUntil(clients.openWindow(link))
})
