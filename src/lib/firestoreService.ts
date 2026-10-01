import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { TaskItem, TaskResource, GlobalResource, UrlLibraryItem, SolicitudItem } from "../types";

export interface UserProfileData {
  userId: string;
  email?: string;
  displayName?: string;
  esencialTaskId?: number | null;
  secundariasTaskIds?: number[];
  updatedAt?: string;
}

// Convert local TaskItem into a clean payload for Firestore conforming to isValidTask
function sanitizeTaskForFirestore(task: TaskItem, userId: string) {
  const payload: Record<string, any> = {
    userId,
    tarea: (task.tarea || "").trim().slice(0, 1000) || "Tarea sin título",
    estado:
      task.estado === "Completado"
        ? "Completada"
        : task.estado === "En Proceso"
        ? "En Proceso"
        : "Pendiente",
    fechaIngreso: (task.fechaIngreso || new Date().toISOString().split("T")[0]).slice(0, 30),
  };

  if (task.fechaLimite) payload.fechaLimite = task.fechaLimite.slice(0, 30);
  if (task.dominio) payload.dominio = task.dominio.slice(0, 100);
  if (task.notas) payload.notas = task.notas.slice(0, 5000);
  if (task.solicitante) payload.solicitante = task.solicitante.slice(0, 150);
  if (task.contacto?.telefono) payload.telefono = task.contacto.telefono.slice(0, 50);
  if (task.googleTaskId) payload.googleTaskId = String(task.googleTaskId).slice(0, 200);
  if (task.googleCalendarEventId) payload.googleCalendarEventId = String(task.googleCalendarEventId).slice(0, 200);
  if (task.googleCalendarHtmlLink) payload.googleCalendarHtmlLink = String(task.googleCalendarHtmlLink).slice(0, 1000);
  if (task.googleSyncStatus) payload.googleSyncStatus = task.googleSyncStatus;
  if (task.lastGoogleSync) payload.lastGoogleSync = String(task.lastGoogleSync).slice(0, 50);
  if (task.imagenReferencia) payload.imagenReferencia = String(task.imagenReferencia).slice(0, 50000);

  if (Array.isArray(task.etiquetas) && task.etiquetas.length > 0) {
    payload.etiquetas = task.etiquetas.slice(0, 20).map((t) => String(t).slice(0, 50));
  }
  if (Array.isArray(task.resources) && task.resources.length > 0) {
    payload.resources = task.resources.slice(0, 50).map((r) => ({
      url: String(r.url || "").slice(0, 1000),
      title: String(r.title || "").slice(0, 300),
      addedAt: String(r.addedAt || new Date().toISOString()).slice(0, 50),
    }));
  }

  return payload;
}

// Save or Update a single task in Firestore
export async function saveTaskToFirestore(userId: string, task: TaskItem): Promise<void> {
  const taskIdStr = String(task.id);
  const taskRef = doc(db, "users", userId, "tasks", taskIdStr);
  const payload = sanitizeTaskForFirestore(task, userId);

  try {
    await setDoc(taskRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/tasks/${taskIdStr}`);
  }
}

// Batch save multiple tasks into Firestore
export async function batchSyncTasksToFirestore(userId: string, tasks: TaskItem[]): Promise<void> {
  const path = `users/${userId}/tasks`;
  try {
    const batch = writeBatch(db);
    tasks.forEach((task) => {
      const taskRef = doc(db, "users", userId, "tasks", String(task.id));
      const payload = sanitizeTaskForFirestore(task, userId);
      batch.set(taskRef, payload, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete task from Firestore
export async function deleteTaskFromFirestore(userId: string, taskId: number): Promise<void> {
  const taskIdStr = String(taskId);
  const taskRef = doc(db, "users", userId, "tasks", taskIdStr);
  try {
    await deleteDoc(taskRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/tasks/${taskIdStr}`);
  }
}

// Load all tasks once from Firestore
export async function loadTasksFromFirestore(userId: string): Promise<TaskItem[]> {
  const path = `users/${userId}/tasks`;
  try {
    const querySnapshot = await getDocs(collection(db, "users", userId, "tasks"));
    const tasks: TaskItem[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const idNum = parseInt(docSnap.id, 10);
      if (!isNaN(idNum)) {
        tasks.push({
          id: idNum,
          tarea: data.tarea || "",
          estado: data.estado === "Completada" ? "Completado" : data.estado || "Pendiente",
          fechaIngreso: data.fechaIngreso || new Date().toISOString().split("T")[0],
          fechaLimite: data.fechaLimite || undefined,
          dominio: data.dominio || "General",
          solicitante: data.solicitante || "Pepe",
          contacto: data.telefono
            ? { nombre: data.solicitante || "Contacto", telefono: data.telefono }
            : undefined,
          etiquetas: Array.isArray(data.etiquetas) ? data.etiquetas : [],
          notas: data.notas || undefined,
          googleTaskId: data.googleTaskId || undefined,
          googleCalendarEventId: data.googleCalendarEventId || undefined,
          googleCalendarHtmlLink: data.googleCalendarHtmlLink || undefined,
          googleSyncStatus: data.googleSyncStatus || undefined,
          lastGoogleSync: data.lastGoogleSync || undefined,
          imagenReferencia: data.imagenReferencia || undefined,
          resources: Array.isArray(data.resources)
            ? data.resources.map((r: any) => ({
                url: r.url || "",
                title: r.title || r.url || "",
                addedAt: r.addedAt || new Date().toISOString(),
              }))
            : [],
        });
      }
    });

    return tasks.sort((a, b) => a.id - b.id);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Subscribe to real-time updates from Firestore
export function subscribeToFirestoreTasks(
  userId: string,
  onTasksChange: (tasks: TaskItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = `users/${userId}/tasks`;
  const unsubscribe = onSnapshot(
    collection(db, "users", userId, "tasks"),
    (snapshot) => {
      const tasks: TaskItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const idNum = parseInt(docSnap.id, 10);
        if (!isNaN(idNum)) {
          tasks.push({
            id: idNum,
            tarea: data.tarea || "",
            estado: data.estado === "Completada" ? "Completado" : data.estado || "Pendiente",
            fechaIngreso: data.fechaIngreso || new Date().toISOString().split("T")[0],
            fechaLimite: data.fechaLimite || undefined,
            dominio: data.dominio || "General",
            solicitante: data.solicitante || "Pepe",
            contacto: data.telefono
              ? { nombre: data.solicitante || "Contacto", telefono: data.telefono }
              : undefined,
            etiquetas: Array.isArray(data.etiquetas) ? data.etiquetas : [],
            notas: data.notas || undefined,
            googleTaskId: data.googleTaskId || undefined,
            googleCalendarEventId: data.googleCalendarEventId || undefined,
            googleCalendarHtmlLink: data.googleCalendarHtmlLink || undefined,
            googleSyncStatus: data.googleSyncStatus || undefined,
            lastGoogleSync: data.lastGoogleSync || undefined,
            imagenReferencia: data.imagenReferencia || undefined,
            resources: Array.isArray(data.resources)
              ? data.resources.map((r: any) => ({
                  url: r.url || "",
                  title: r.title || r.url || "",
                  addedAt: r.addedAt || new Date().toISOString(),
                }))
              : [],
          });
        }
      });
      onTasksChange(tasks.sort((a, b) => a.id - b.id));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );

  return unsubscribe;
}

// =========================================================
// GLOBAL RESOURCES FIRESTORE SERVICE (Universal Search Index)
// =========================================================
function sanitizeGlobalResourceForFirestore(res: GlobalResource, userId: string) {
  return {
    userId,
    url: String(res.url || "").trim().slice(0, 1000),
    title: String(res.title || res.url || "").trim().slice(0, 300),
    keywords: Array.isArray(res.keywords)
      ? res.keywords.slice(0, 10).map((k) => String(k).slice(0, 50))
      : [],
    savedAt: String(res.savedAt || new Date().toISOString()).slice(0, 50),
  };
}

export async function saveGlobalResourceToFirestore(
  userId: string,
  resource: GlobalResource
): Promise<void> {
  const resourceIdStr = String(resource.id).replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `users/${userId}/global_resources/${resourceIdStr}`;
  const resRef = doc(db, "users", userId, "global_resources", resourceIdStr);
  const payload = sanitizeGlobalResourceForFirestore(resource, userId);

  try {
    await setDoc(resRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteGlobalResourceFromFirestore(
  userId: string,
  resourceId: string
): Promise<void> {
  const resourceIdStr = String(resourceId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `users/${userId}/global_resources/${resourceIdStr}`;
  const resRef = doc(db, "users", userId, "global_resources", resourceIdStr);
  try {
    await deleteDoc(resRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function loadGlobalResourcesFromFirestore(userId: string): Promise<GlobalResource[]> {
  const path = `users/${userId}/global_resources`;
  try {
    const snapshot = await getDocs(collection(db, "users", userId, "global_resources"));
    const resources: GlobalResource[] = [];
    snapshot.forEach((snap) => {
      const data = snap.data();
      resources.push({
        id: snap.id,
        url: data.url || "",
        title: data.title || data.url || "",
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        savedAt: data.savedAt || new Date().toISOString(),
      });
    });
    return resources.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeToGlobalResources(
  userId: string,
  onResourcesChange: (resources: GlobalResource[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = `users/${userId}/global_resources`;
  const unsubscribe = onSnapshot(
    collection(db, "users", userId, "global_resources"),
    (snapshot) => {
      const resources: GlobalResource[] = [];
      snapshot.forEach((snap) => {
        const data = snap.data();
        resources.push({
          id: snap.id,
          url: data.url || "",
          title: data.title || data.url || "",
          keywords: Array.isArray(data.keywords) ? data.keywords : [],
          savedAt: data.savedAt || new Date().toISOString(),
        });
      });
      onResourcesChange(resources.sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );

  return unsubscribe;
}

export async function batchSyncGlobalResourcesToFirestore(
  userId: string,
  resources: GlobalResource[]
): Promise<void> {
  const path = `users/${userId}/global_resources`;
  try {
    const batch = writeBatch(db);
    resources.forEach((r) => {
      const resId = String(r.id).replace(/[^a-zA-Z0-9_-]/g, "_");
      const resRef = doc(db, "users", userId, "global_resources", resId);
      const payload = sanitizeGlobalResourceForFirestore(r, userId);
      batch.set(resRef, payload, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// User Profile & Focus State sync
export async function saveProfileToFirestore(
  userId: string,
  profile: Partial<UserProfileData>
): Promise<void> {
  const path = `users/${userId}/profile/info`;
  try {
    const profileRef = doc(db, "users", userId, "profile", "info");
    const payload: Record<string, any> = {
      userId,
      updatedAt: new Date().toISOString(),
    };
    if (profile.email) payload.email = profile.email.slice(0, 200);
    if (profile.displayName) payload.displayName = profile.displayName.slice(0, 100);
    if (typeof profile.esencialTaskId === "number") payload.esencialTaskId = profile.esencialTaskId;
    if (Array.isArray(profile.secundariasTaskIds)) payload.secundariasTaskIds = profile.secundariasTaskIds;

    await setDoc(profileRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// =========================================================
// URL LIBRARY SERVICE (Biblioteca de URLs Día a Día)
// =========================================================
function sanitizeUrlLibraryItemForFirestore(item: UrlLibraryItem, userId: string) {
  const payload: Record<string, any> = {
    userId,
    url: String(item.url || "").trim().slice(0, 1000),
    title: String(item.title || item.url || "").trim().slice(0, 300),
    createdAt: String(item.createdAt || new Date().toISOString()).slice(0, 50),
  };
  if (item.categoria) payload.categoria = item.categoria.slice(0, 100);
  if (item.descripcion) payload.descripcion = item.descripcion.slice(0, 1000);
  if (item.icon) payload.icon = item.icon.slice(0, 1000);
  if (typeof item.isFavorite === "boolean") payload.isFavorite = item.isFavorite;
  if (typeof item.clicks === "number") payload.clicks = item.clicks;
  if (Array.isArray(item.keywords) && item.keywords.length > 0) {
    payload.keywords = item.keywords.slice(0, 20).map((k) => String(k).slice(0, 50));
  }
  if (item.updatedAt) payload.updatedAt = item.updatedAt.slice(0, 50);
  if (item.lastOpenedAt) payload.lastOpenedAt = item.lastOpenedAt.slice(0, 50);
  return payload;
}

export async function saveUrlLibraryItemToFirestore(
  userId: string,
  item: UrlLibraryItem
): Promise<void> {
  const idStr = String(item.id).replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `users/${userId}/url_library/${idStr}`;
  const docRef = doc(db, "users", userId, "url_library", idStr);
  const payload = sanitizeUrlLibraryItemForFirestore(item, userId);

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUrlLibraryItemFromFirestore(
  userId: string,
  itemId: string
): Promise<void> {
  const idStr = String(itemId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `users/${userId}/url_library/${idStr}`;
  const docRef = doc(db, "users", userId, "url_library", idStr);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function loadUrlLibraryFromFirestore(userId: string): Promise<UrlLibraryItem[]> {
  const path = `users/${userId}/url_library`;
  try {
    const snapshot = await getDocs(collection(db, "users", userId, "url_library"));
    const items: UrlLibraryItem[] = [];
    snapshot.forEach((snap) => {
      const data = snap.data();
      items.push({
        id: snap.id,
        url: data.url || "",
        title: data.title || data.url || "",
        categoria: data.categoria || undefined,
        descripcion: data.descripcion || undefined,
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        icon: data.icon || undefined,
        isFavorite: Boolean(data.isFavorite),
        clicks: typeof data.clicks === "number" ? data.clicks : 0,
        lastOpenedAt: data.lastOpenedAt || undefined,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || undefined,
      });
    });
    return items.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeToUrlLibrary(
  userId: string,
  onUrlsChange: (urls: UrlLibraryItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = `users/${userId}/url_library`;
  const unsubscribe = onSnapshot(
    collection(db, "users", userId, "url_library"),
    (snapshot) => {
      const items: UrlLibraryItem[] = [];
      snapshot.forEach((snap) => {
        const data = snap.data();
        items.push({
          id: snap.id,
          url: data.url || "",
          title: data.title || data.url || "",
          categoria: data.categoria || undefined,
          descripcion: data.descripcion || undefined,
          keywords: Array.isArray(data.keywords) ? data.keywords : [],
          icon: data.icon || undefined,
          isFavorite: Boolean(data.isFavorite),
          clicks: typeof data.clicks === "number" ? data.clicks : 0,
          lastOpenedAt: data.lastOpenedAt || undefined,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || undefined,
        });
      });
      onUrlsChange(items.sort((a, b) => (b.clicks || 0) - (a.clicks || 0)));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );

  return unsubscribe;
}

export async function batchSyncUrlLibraryToFirestore(
  userId: string,
  urls: UrlLibraryItem[]
): Promise<void> {
  const path = `users/${userId}/url_library`;
  try {
    const batch = writeBatch(db);
    urls.forEach((item) => {
      const idStr = String(item.id).replace(/[^a-zA-Z0-9_-]/g, "_");
      const docRef = doc(db, "users", userId, "url_library", idStr);
      const payload = sanitizeUrlLibraryItemForFirestore(item, userId);
      batch.set(docRef, payload, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// =========================================================
// SOLICITUDES SERVICE (Centro de Solicitudes y Notificaciones)
// =========================================================
function sanitizeSolicitudForFirestore(sol: SolicitudItem, userId: string) {
  const payload: Record<string, any> = {
    userId,
    solicitante: String(sol.solicitante || "Contacto").trim().slice(0, 150),
    titulo: String(sol.titulo || sol.descripcion?.slice(0, 50) || "Solicitud").trim().slice(0, 300),
    descripcion: String(sol.descripcion || "").trim().slice(0, 5000),
    fechaIngreso: String(sol.fechaIngreso || new Date().toISOString()).slice(0, 50),
    leida: Boolean(sol.leida),
  };
  if (sol.telefono) payload.telefono = String(sol.telefono).slice(0, 50);
  if (sol.email) payload.email = String(sol.email).slice(0, 200);
  if (sol.canal) payload.canal = String(sol.canal).slice(0, 50);
  if (sol.prioridad) payload.prioridad = sol.prioridad;
  if (sol.estado) payload.estado = sol.estado;
  if (typeof sol.tareaIdAsociada === "number") payload.tareaIdAsociada = sol.tareaIdAsociada;
  return payload;
}

export async function saveSolicitudToFirestore(
  userId: string,
  solicitud: SolicitudItem
): Promise<void> {
  const idStr = String(solicitud.id).replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `users/${userId}/solicitudes/${idStr}`;
  const docRef = doc(db, "users", userId, "solicitudes", idStr);
  const payload = sanitizeSolicitudForFirestore(solicitud, userId);

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSolicitudFromFirestore(
  userId: string,
  solicitudId: string
): Promise<void> {
  const idStr = String(solicitudId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `users/${userId}/solicitudes/${idStr}`;
  const docRef = doc(db, "users", userId, "solicitudes", idStr);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function loadSolicitudesFromFirestore(userId: string): Promise<SolicitudItem[]> {
  const path = `users/${userId}/solicitudes`;
  try {
    const snapshot = await getDocs(collection(db, "users", userId, "solicitudes"));
    const items: SolicitudItem[] = [];
    snapshot.forEach((snap) => {
      const data = snap.data();
      items.push({
        id: snap.id,
        solicitante: data.solicitante || "Contacto",
        telefono: data.telefono || undefined,
        email: data.email || undefined,
        titulo: data.titulo || "Solicitud",
        descripcion: data.descripcion || "",
        canal: data.canal || "WhatsApp",
        prioridad: data.prioridad || "Alta",
        estado: data.estado || "Nueva",
        fechaIngreso: data.fechaIngreso || new Date().toISOString(),
        leida: Boolean(data.leida),
        tareaIdAsociada: typeof data.tareaIdAsociada === "number" ? data.tareaIdAsociada : undefined,
      });
    });
    return items.sort((a, b) => b.fechaIngreso.localeCompare(a.fechaIngreso));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeToSolicitudes(
  userId: string,
  onSolicitudesChange: (items: SolicitudItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = `users/${userId}/solicitudes`;
  const unsubscribe = onSnapshot(
    collection(db, "users", userId, "solicitudes"),
    (snapshot) => {
      const items: SolicitudItem[] = [];
      snapshot.forEach((snap) => {
        const data = snap.data();
        items.push({
          id: snap.id,
          solicitante: data.solicitante || "Contacto",
          telefono: data.telefono || undefined,
          email: data.email || undefined,
          titulo: data.titulo || "Solicitud",
          descripcion: data.descripcion || "",
          canal: data.canal || "WhatsApp",
          prioridad: data.prioridad || "Alta",
          estado: data.estado || "Nueva",
          fechaIngreso: data.fechaIngreso || new Date().toISOString(),
          leida: Boolean(data.leida),
          tareaIdAsociada: typeof data.tareaIdAsociada === "number" ? data.tareaIdAsociada : undefined,
        });
      });
      onSolicitudesChange(items.sort((a, b) => b.fechaIngreso.localeCompare(a.fechaIngreso)));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );

  return unsubscribe;
}

export const subscribeToFirestoreSolicitudes = subscribeToSolicitudes;


