/* global self, URL */

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : 'You have a new class reminder.' };
  }
  const title = typeof payload.title === 'string' ? payload.title : 'Attendity class reminder';
  const options = {
    body: typeof payload.body === 'string' ? payload.body : 'An upcoming class starts soon.',
    icon: '/app-icon.svg',
    badge: '/app-icon.svg',
    tag: typeof payload.tag === 'string' ? payload.tag : 'attendity-class-reminder',
    data: {
      url:
        typeof payload.url === 'string' && payload.url.startsWith('/')
          ? payload.url
          : '/app/account',
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? '/app/account', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url === target);
      return existing ? existing.focus() : self.clients.openWindow(target);
    }),
  );
});
