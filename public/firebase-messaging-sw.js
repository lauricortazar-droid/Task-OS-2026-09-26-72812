/* eslint-disable no-undef */
// Firebase Cloud Messaging Service Worker (FCM)
// Enables Web Push notifications on Mobile (Android Chrome, iOS PWA) and Desktop

importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyC2G1AOOMukboJJvv6AIrcJy5WHAtA8hGk",
  authDomain: "gen-lang-client-0098696571.firebaseapp.com",
  projectId: "gen-lang-client-0098696571",
  storageBucket: "gen-lang-client-0098696571.firebasestorage.app",
  messagingSenderId: "268081973600",
  appId: "1:268081973600:web:992918dbc175a866a2b605"
};

// Initialize Firebase inside the Service Worker
firebase.initializeApp(firebaseConfig);

let messaging;
try {
  messaging = firebase.messaging();
} catch (err) {
  console.warn("[firebase-messaging-sw.js] Messaging initialization:", err);
}

// Background message handler from Firebase Cloud Messaging
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Mensaje push en segundo plano recibido:", payload);

    const title = payload.notification?.title || payload.data?.title || "Task-OS Notificación";
    const body = payload.notification?.body || payload.data?.body || "Nueva actualización en tus pendientes.";
    const icon = payload.notification?.icon || payload.data?.icon || "/icon-192.svg";
    const tag = payload.data?.tag || "task-os-notification";
    const url = payload.data?.url || "/";

    const notificationOptions = {
      body,
      icon,
      badge: "/icon-192.svg",
      tag,
      renotify: true,
      vibrate: [250, 100, 250, 100, 250],
      data: {
        url,
        dateOfArrival: Date.now(),
        primaryKey: tag,
      },
      actions: [
        { action: "open", title: "Abrir Task-OS" },
        { action: "close", title: "Descartar" }
      ]
    };

    return self.registration.showNotification(title, notificationOptions);
  });
}

// Fallback generic push listener for direct Web Push payloads
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || data.notification?.title || "Task-OS Push";
    const options = {
      body: data.body || data.notification?.body || "Aviso importante de tarea o cliente.",
      icon: data.icon || data.notification?.icon || "/icon-192.svg",
      badge: "/icon-192.svg",
      tag: data.tag || `push-${Date.now()}`,
      renotify: true,
      vibrate: [250, 100, 250],
      data: {
        url: data.url || data.data?.url || "/",
        timestamp: Date.now()
      },
      actions: [
        { action: "open", title: "Ver en Task-OS" }
      ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // Text fallback
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("Task-OS Notificación", {
        body: text,
        icon: "/icon-192.svg",
        vibrate: [200, 100, 200]
      })
    );
  }
});

// Click on notification: focus current window or open new
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") {
    return;
  }

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
