// À placer dans le dossier public/ du frontend (accessible donc à la racine :
// https://club-anglais.vercel.app/sw.js). C'est ce fichier qui permet de recevoir
// une notification même si l'onglet/l'app est fermé(e).

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Club Anglais', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Club Anglais';
  const options = {
    body: data.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || undefined,
    data: { url: data.url || '/' },
  };

  event.waitUntil(
    (async () => {
      // Si une fenêtre de l'app est déjà visible au premier plan, elle a déjà
      // reçu le message via le WebSocket (bip + éventuelle notif JS) : on évite
      // d'afficher une notification en double.
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const hasVisibleClient = clientsList.some((c) => c.visibilityState === 'visible');
      if (hasVisibleClient) return;
      await self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});