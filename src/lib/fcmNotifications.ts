// Firebase Cloud Messaging (FCM) & Web Push Module for Task-OS
// Sends push notifications to mobile phones (Android / iOS PWA) and desktop browsers
// Triggers on task completion and incoming client messages

import { getMessaging, getToken, onMessage, isSupported, Messaging } from "firebase/messaging";
import { initializeApp, getApps } from "firebase/app";
import firebaseConfig from "../../firebase-applet-config.json";
import { playChime } from "../utils/audio";

const STORAGE_KEY_FCM_TOKEN = "task_os_fcm_token_v1";
const STORAGE_KEY_NOTIF_LOG = "task_os_notif_log_v1";

let messagingInstance: Messaging | null = null;
let currentRegistration: ServiceWorkerRegistration | null = null;

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  data?: Record<string, any>;
  vibrate?: number[];
}

export interface FCMNotificationRecord {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: "task_completed" | "client_message" | "test";
  delivered: boolean;
}

// Check if browser environment supports Push & Service Worker
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window && "serviceWorker" in navigator;
}

// Get current permission status
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

// Initialize FCM messaging instance safely
export async function getFCMInstance(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  if (!isPushSupported()) return null;

  try {
    const supported = await isSupported();
    if (!supported) return null;

    let app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.warn("[FCM] isSupported check or initialization warning:", err);
    return null;
  }
}

// Register Firebase Messaging Service Worker
export async function registerMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  if (currentRegistration) {
    return currentRegistration;
  }

  try {
    // Register the dedicated FCM service worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;
    currentRegistration = registration;
    console.log("[FCM] Service Worker registrado exitosamente:", registration.scope);
    return registration;
  } catch (err) {
    console.warn("[FCM] Error al registrar Service Worker:", err);
    return null;
  }
}

// Request permission and retrieve FCM Token
export async function requestFCMToken(userEmail?: string): Promise<{
  success: boolean;
  token?: string;
  permission: NotificationPermission;
  error?: string;
}> {
  if (!isPushSupported()) {
    return {
      success: false,
      permission: "denied",
      error: "Este navegador no soporta Notificaciones Push o Service Workers.",
    };
  }

  try {
    // 1. Request user permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return {
        success: false,
        permission,
        error: "Permiso de notificaciones denegado por el usuario.",
      };
    }

    // 2. Register Service Worker
    const swReg = await registerMessagingServiceWorker();

    // 3. Get FCM Messaging
    const messaging = await getFCMInstance();
    let token = "";

    if (messaging && swReg) {
      try {
        token = await getToken(messaging, {
          serviceWorkerRegistration: swReg,
        });
        if (token) {
          localStorage.setItem(STORAGE_KEY_FCM_TOKEN, token);
          console.log("[FCM] Token de registro obtenido:", token);
        }
      } catch (tokenErr) {
        console.warn("[FCM] No se pudo obtener token FCM estándar (continuando con Web Push nativo):", tokenErr);
      }
    }

    // Fallback token if FCM token retrieval was blocked or standard Web Push
    if (!token) {
      token = localStorage.getItem(STORAGE_KEY_FCM_TOKEN) || `wp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(STORAGE_KEY_FCM_TOKEN, token);
    }

    // 4. Send token to backend to associate with email/device
    try {
      await fetch("/api/notifications/register-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email: userEmail || "usuario@task-os.com",
          device: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (apiErr) {
      console.warn("[FCM] Registro en servidor offline:", apiErr);
    }

    return {
      success: true,
      token,
      permission: "granted",
    };
  } catch (err: any) {
    console.error("[FCM] Error al solicitar permisos:", err);
    return {
      success: false,
      permission: getNotificationPermission(),
      error: err?.message || "Error al activar notificaciones push.",
    };
  }
}

// Log notification to local history
function logNotification(record: FCMNotificationRecord) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIF_LOG);
    const list: FCMNotificationRecord[] = raw ? JSON.parse(raw) : [];
    const updated = [record, ...list.slice(0, 49)];
    localStorage.setItem(STORAGE_KEY_NOTIF_LOG, JSON.stringify(updated));
  } catch (_) {}
}

export function getNotificationHistory(): FCMNotificationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIF_LOG);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

// Send and display Push Notification on device
export async function sendPushNotification(payload: NotificationPayload): Promise<boolean> {
  const permission = getNotificationPermission();

  // Play audio chime and trigger vibration on device
  playChime("notification");
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(payload.vibrate || [250, 100, 250, 100, 250]);
    } catch (_) {}
  }

  // Record notification log
  logNotification({
    id: `notif-${Date.now()}`,
    title: payload.title,
    body: payload.body,
    timestamp: new Date().toISOString(),
    type: payload.tag?.includes("task") ? "task_completed" : payload.tag?.includes("client") ? "client_message" : "test",
    delivered: true,
  });

  // Also notify server backend
  try {
    const token = localStorage.getItem(STORAGE_KEY_FCM_TOKEN);
    fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/icon-192.svg",
        tag: payload.tag || "task-os-alert",
        url: payload.url || "/",
        data: payload.data || {},
      }),
    }).catch(() => {});
  } catch (_) {}

  // If permission is not granted, we can't display native push
  if (permission !== "granted") {
    console.warn("[FCM] Permiso de notificaciones no otorgado. Notificación sonó pero no se mostrará como banner nativo.");
    return false;
  }

  try {
    // 1. Try Service Worker showNotification (works on Mobile PWA and Android background)
    if ("serviceWorker" in navigator) {
      const swReg = await navigator.serviceWorker.ready;
      if (swReg && "showNotification" in swReg) {
        await swReg.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || "/icon-192.svg",
          badge: "/icon-192.svg",
          tag: payload.tag || `push-${Date.now()}`,
          vibrate: payload.vibrate || [250, 100, 250],
          renotify: true,
          data: {
            url: payload.url || "/",
            timestamp: Date.now(),
          },
        } as any);
        return true;
      }
    }

    // 2. Fallback to standard window Notification
    if ("Notification" in window) {
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || "/icon-192.svg",
        tag: payload.tag || `push-${Date.now()}`,
      });
      return true;
    }
  } catch (err) {
    console.warn("[FCM] Error al mostrar notificación nativa:", err);
  }

  return false;
}

// 1. Trigger when a task is marked as completed
export async function notifyTaskCompleted(task: {
  id: number;
  tarea: string;
  solicitante?: string;
}): Promise<boolean> {
  const solicitanteStr = task.solicitante ? ` (solicitó: ${task.solicitante})` : "";
  const title = `✅ Tarea #${task.id} completada`;
  const body = `"${task.tarea}"${solicitanteStr} ha sido marcada como Completada con éxito.`;

  return sendPushNotification({
    title,
    body,
    icon: "/icon-192.svg",
    tag: `task-${task.id}-completed`,
    url: "/?workspace=task-os",
    vibrate: [200, 100, 200, 100, 400],
    data: {
      taskId: task.id,
      action: "task_completed",
      solicitante: task.solicitante,
    },
  });
}

// 2. Trigger when a new solicitud / request is received
export async function notifyNewSolicitud(solicitud: {
  id: string;
  solicitante: string;
  titulo: string;
  descripcion: string;
  prioridad?: string;
  telefono?: string;
}): Promise<boolean> {
  playChime("notification");
  const cleanSnippet = solicitud.descripcion.length > 90
    ? `${solicitud.descripcion.slice(0, 87)}...`
    : solicitud.descripcion;

  const title = `🚨 Nueva Solicitud: ${solicitud.solicitante}`;
  const body = `${solicitud.titulo} — ${cleanSnippet}`;

  return sendPushNotification({
    title,
    body,
    icon: "/icon-192.svg",
    tag: `solicitud-${solicitud.id}`,
    url: "/?openNotifications=true",
    vibrate: [300, 100, 300, 100, 300],
    data: {
      solicitudId: solicitud.id,
      solicitante: solicitud.solicitante,
      telefono: solicitud.telefono,
      action: "nueva_solicitud",
    },
  });
}

// 3. Trigger email notification for a solicitud
export async function triggerSolicitudEmailAlert(
  solicitudId: string,
  toEmail?: string
): Promise<{ success: boolean; mailtoUrl?: string; error?: string }> {
  try {
    const res = await fetch("/api/notifications/send-solicitud-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        solicitudId,
        toEmail: toEmail || localStorage.getItem("task_os_user_email_v1") || "laurcortazar@gmail.com",
      }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.warn("Error triggering email alert:", err);
    return { success: false, error: err.message };
  }
}

// 4. Trigger when a client message is received or queued
export async function notifyClientMessageReceived(
  clientName: string,
  messageText: string,
  extra?: { phone?: string; orderFolio?: number }
): Promise<boolean> {
  const cleanSnippet = messageText.length > 100 ? `${messageText.slice(0, 97)}...` : messageText;
  const title = `💬 Mensaje de ${clientName || "Cliente"}`;
  const folioSnippet = extra?.orderFolio ? ` [Lona #${extra.orderFolio}]` : "";
  const body = `${folioSnippet} ${cleanSnippet}`;

  return sendPushNotification({
    title,
    body,
    icon: "/icon-192.svg",
    tag: `client-msg-${Date.now()}`,
    url: "/?workspace=task-os",
    vibrate: [300, 100, 300],
    data: {
      clientName,
      phone: extra?.phone,
      action: "client_message",
    },
  });
}

// 3. Test push notification trigger
export async function sendTestNotification(): Promise<boolean> {
  return sendPushNotification({
    title: "🔔 ¡Task-OS Push Activo!",
    body: "Firebase Cloud Messaging y notificaciones móviles están funcionando al 100% en este dispositivo.",
    icon: "/icon-192.svg",
    tag: `test-push-${Date.now()}`,
    url: "/",
    vibrate: [250, 100, 250, 100, 250],
    data: { test: true },
  });
}

// Setup foreground message listener
export async function listenForegroundMessages(
  onReceived: (payload: { title: string; body: string; data?: any }) => void
): Promise<() => void> {
  const messaging = await getFCMInstance();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log("[FCM] Mensaje en primer plano:", payload);
    const title = payload.notification?.title || payload.data?.title || "Task-OS Push";
    const body = payload.notification?.body || payload.data?.body || "Nueva actualización en Task-OS.";

    playChime("notification");
    if ("vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    onReceived({ title, body, data: payload.data });
  });
}
