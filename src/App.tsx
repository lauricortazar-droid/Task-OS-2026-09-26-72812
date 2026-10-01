import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import ExecutiveInput from "./components/ExecutiveInput";
import MessageOutputCard from "./components/MessageOutputCard";
import PomodoroArtifact from "./components/PomodoroArtifact";
import LedgerTable from "./components/LedgerTable";
import ContactsModal from "./components/ContactsModal";
import TagsModal, { DEFAULT_TAGS } from "./components/TagsModal";
import SyncModal from "./components/SyncModal";
import ConnectionSyncMenuModal from "./components/ConnectionSyncMenuModal";
import GoogleWorkspaceModal from "./components/GoogleWorkspaceModal";
import MobileNavBar from "./components/MobileNavBar";
import WeeklyPerformanceDashboard from "./components/WeeklyPerformanceDashboard";
import WorkMusicPlayer from "./components/WorkMusicPlayer";
import LonasOS, { STORAGE_KEY_LONAS, INITIAL_LONAS_ORDERS } from "./components/LonasOS";
import SaludFinancieraOS from "./components/SaludFinancieraOS";
import ActiveTaskSelector from "./components/ActiveTaskSelector";
import RouterLogViewer from "./components/RouterLogViewer";
import UniversalSearchModal from "./components/UniversalSearchModal";
import ExportImportModal from "./components/ExportImportModal";
import UndoToast, { UndoActionPayload } from "./components/UndoToast";
import UrlLibraryOS, { INITIAL_URL_LIBRARY } from "./components/UrlLibraryOS";
import PrintOS from "./components/PrintOS";
import NotificationsModal from "./components/NotificationsModal";
import {
  notifyTaskCompleted,
  notifyClientMessageReceived,
  listenForegroundMessages,
  getNotificationPermission,
  registerMessagingServiceWorker,
  notifyNewSolicitud,
  triggerSolicitudEmailAlert,
} from "./lib/fcmNotifications";
import {
  Contact,
  TaskItem,
  TaskResource,
  GlobalResource,
  UrlLibraryItem,
  RouterStructuredOutput,
  TaskOSExportData,
  TaskOSResponse,
  WhatsAppMessageItem,
  TagItem,
  SyncStatus,
  CloudSyncPayload,
  WorkspaceTab,
  PrintItem,
  LonasOrder,
  SolicitudItem,
} from "./types";
import { routeExecutiveInput } from "./lib/executiveRouter";
import {
  saveTaskToFirestore,
  saveGlobalResourceToFirestore,
  deleteGlobalResourceFromFirestore,
  saveUrlLibraryItemToFirestore,
  deleteUrlLibraryItemFromFirestore,
  subscribeToFirestoreTasks,
  subscribeToGlobalResources,
  subscribeToUrlLibrary,
  batchSyncTasksToFirestore,
  batchSyncGlobalResourcesToFirestore,
  batchSyncUrlLibraryToFirestore,
  saveSolicitudToFirestore,
  deleteSolicitudFromFirestore,
  subscribeToSolicitudes,
} from "./lib/firestoreService";
import { auth, initAuth } from "./lib/firebase";
import { playChime } from "./utils/audio";
import { Flame, Sparkles, Users, Tag as TagIcon, Cloud, Printer, Wallet, Bookmark } from "lucide-react";

const STORAGE_KEY_TASKS = "task_os_pepe_cortazar_ledger_v1";
const STORAGE_KEY_GLOBAL_RESOURCES = "task_os_global_resources_v1";
const STORAGE_KEY_URL_LIBRARY = "task_os_url_library_v1";
const STORAGE_KEY_ACTIVE_TASK_ID = "task_os_active_task_id_v1";
const STORAGE_KEY_CONTACTS = "task_os_pepe_contacts_v1";
const STORAGE_KEY_TAGS = "task_os_pepe_tags_v1";
const STORAGE_KEY_USER_EMAIL = "task_os_user_email_v1";
const DEFAULT_USER_EMAIL = "laurcortazar@gmail.com";
const STORAGE_KEY_SOLICITUDES = "task_os_solicitudes_v1";

const INITIAL_SOLICITUDES: SolicitudItem[] = [
  {
    id: "sol-101",
    solicitante: "Laura",
    telefono: "+52 55 1234 5678",
    email: "laura@universidad-fgdll.org",
    titulo: "Revisar lista de diplomas y reconocimientos de graduación",
    descripcion: "Por favor verificar los nombres de los 45 graduados antes de imprimir los reconocimientos oficiales.",
    canal: "WhatsApp",
    prioridad: "Alta",
    estado: "Nueva",
    fechaIngreso: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    leida: false,
  },
  {
    id: "sol-102",
    solicitante: "Líder Zona Tiburón",
    telefono: "+52 55 9876 5432",
    titulo: "Diseño y cotización de lona 3x2m para evento del sábado",
    descripcion: "Requerimos lona en material front brillante con ojillos cada 50cm para el acceso principal.",
    canal: "WhatsApp",
    prioridad: "Alta",
    estado: "Nueva",
    fechaIngreso: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    leida: false,
  },
  {
    id: "sol-103",
    solicitante: "Taller Impresión",
    telefono: "+52 55 4567 8901",
    titulo: "Validación de perfil de color en archivo Figma",
    descripcion: "El archivo enviado está en RGB, requerimos confirmación si lo convertimos a CMYK Fogra39.",
    canal: "Web",
    prioridad: "Media",
    estado: "Atendida",
    fechaIngreso: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    leida: true,
  },
];

const INITIAL_CONTACTS: Contact[] = [
  {
    id: "c-1",
    nombre: "Laura",
    telefono: "+52 55 1234 5678",
    rol: "Coordinación y Proyectos",
    dominio: "Laura",
  },
  {
    id: "c-2",
    nombre: "Líder Zona Tiburón",
    telefono: "+52 55 9876 5432",
    rol: "Líder de Zona FGDLL",
    dominio: "FGDLL",
  },
  {
    id: "c-3",
    nombre: "Director Gladiadores",
    telefono: "+52 55 4567 8901",
    rol: "Director de Zona",
    dominio: "FGDLL",
  },
  {
    id: "c-4",
    nombre: "Proveedor de Lonas",
    telefono: "+52 55 2345 6789",
    rol: "Taller Impresión y Montaje",
    dominio: "Diseño",
  },
  {
    id: "c-5",
    nombre: "Coordinación Universidad FGDLL",
    telefono: "+52 55 8765 4321",
    rol: "Diplomados y Reconocimientos",
    dominio: "Universidad",
  },
];

const INITIAL_GLOBAL_RESOURCES: GlobalResource[] = [
  {
    id: "g-res-1",
    url: "https://drive.google.com/drive/folders/1FGDLL-Plantillas",
    title: "Carpeta Drive • Plantillas y Formatos Oficiales FGDLL",
    keywords: ["plantillas", "formatos", "fgdll", "drive", "documentos"],
    savedAt: "2026-09-21T10:00:00.000Z",
  },
  {
    id: "g-res-2",
    url: "https://www.figma.com/file/lonas-gran-formato",
    title: "Guía de Especificaciones y Perfiles de Color para Lonas",
    keywords: ["lonas", "especificaciones", "impresión", "color", "diseño"],
    savedAt: "2026-09-21T11:30:00.000Z",
  },
];

const INITIAL_TASKS: TaskItem[] = [
  {
    id: 1,
    solicitante: "Laura",
    tarea: "Revisar y corregir los reconocimientos antes de enviarlos",
    estado: "En Proceso",
    fechaIngreso: "2026-09-21",
    fechaLimite: "2026-09-23",
    dominio: "Laura",
    etiquetas: ["Urgente", "Universidad", "Reconocimientos"],
    contacto: {
      nombre: "Laura",
      telefono: "+52 55 1234 5678",
    },
    notas: "Validar ortografía en apellidos compuestos y fecha de emisión con el archivo Excel de graduados.",
    resources: [
      {
        url: "https://docs.google.com/spreadsheets/d/graduados-2026",
        title: "Lista Excel de Graduados y Validaciones",
        addedAt: "2026-09-21T10:15:00.000Z",
      },
    ],
  },
  {
    id: 2,
    solicitante: "Líder Zona Tiburón",
    tarea: "Preparar y enviar la lona para la experiencia. Fecha límite: mañana",
    estado: "En Proceso",
    fechaIngreso: "2026-09-21",
    fechaLimite: "2026-09-22",
    dominio: "FGDLL",
    etiquetas: ["Importante", "Zona Tiburón", "Diseño"],
    contacto: {
      nombre: "Líder Zona Tiburón",
      telefono: "+52 55 9876 5432",
    },
    notas: "Medidas solicitadas: 3.0 x 2.0 m en lona front brillante con ojillos perimetrales reforzados cada 50 cm.",
    resources: [
      {
        url: "https://drive.google.com/file/d/lona-tiburon-arte-final",
        title: "Arte Final Lona Tiburón (3.0 x 2.0m)",
        addedAt: "2026-09-21T12:00:00.000Z",
      },
    ],
  },
  {
    id: 3,
    solicitante: "Pepe",
    tarea: "Revisar el panel de administración de FGDLL e incluir opción de eliminar centros mañana",
    estado: "Pendiente",
    fechaIngreso: "2026-09-21",
    fechaLimite: "2026-09-25",
    dominio: "Tecnología",
    etiquetas: ["Pendiente", "Tecnología"],
    resources: [],
  },
];

export default function App() {
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TASKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load saved ledger", e);
    }
    return INITIAL_TASKS;
  });

  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONTACTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load saved contacts", e);
    }
    return INITIAL_CONTACTS;
  });

  const [tags, setTags] = useState<TagItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TAGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load saved tags", e);
    }
    return DEFAULT_TAGS;
  });

  const [solicitudes, setSolicitudes] = useState<SolicitudItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SOLICITUDES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load saved solicitudes", e);
    }
    return INITIAL_SOLICITUDES;
  });

  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isConnectionMenuOpen, setIsConnectionMenuOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isPushActive, setIsPushActive] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceTab>("task-os");
  const [currentPrintItem, setCurrentPrintItem] = useState<PrintItem | null>(null);

  // Cloud Sync state (Email synchronization for Phone ↔ PC)
  const [syncEmail, setSyncEmail] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const paramEmail = params.get("syncEmail");
        if (paramEmail && paramEmail.includes("@")) {
          localStorage.setItem(STORAGE_KEY_USER_EMAIL, paramEmail);
          // Clean URL without reload
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, "", cleanUrl);
          return paramEmail;
        }
        const saved = localStorage.getItem(STORAGE_KEY_USER_EMAIL);
        if (saved) return saved;
      }
    } catch (e) {
      console.error("Failed to read syncEmail from url/storage", e);
    }
    return DEFAULT_USER_EMAIL;
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    email: DEFAULT_USER_EMAIL,
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
  });

  const [globalResources, setGlobalResources] = useState<GlobalResource[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GLOBAL_RESOURCES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load saved global resources", e);
    }
    return INITIAL_GLOBAL_RESOURCES;
  });

  // URL Library state (Biblioteca de URLs del Día a Día)
  const [urlLibrary, setUrlLibrary] = useState<UrlLibraryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_URL_LIBRARY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load saved url library", e);
    }
    return INITIAL_URL_LIBRARY;
  });

  // Lonas Orders state for cross-linking (Drive, Print, OUT, URLs)
  const [lonasOrders, setLonasOrders] = useState<LonasOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LONAS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return INITIAL_LONAS_ORDERS;
  });

  const [activeTaskId, setActiveTaskId] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_TASK_ID);
      if (saved !== null && saved !== "") return JSON.parse(saved);
    } catch (_) {}
    return 1;
  });

  const [lastRouterOutput, setLastRouterOutput] = useState<RouterStructuredOutput | null>(null);
  const [undoAction, setUndoAction] = useState<UndoActionPayload | null>(null);
  const [isUniversalSearchOpen, setIsUniversalSearchOpen] = useState(false);
  const [universalSearchInitialQuery, setUniversalSearchInitialQuery] = useState("");
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);

  const [esencialTaskId, setEsencialTaskId] = useState<number | null>(1);
  const [secundariasTaskIds, setSecundariasTaskIds] = useState<number[]>([2]);

  const [lastMessage, setLastMessage] = useState<string | null>(
    "Sí, ya lo tengo anotado. Reviso los reconocimientos antes de enviarlos y te aviso cuando queden listos."
  );
  const [lastSolicitante, setLastSolicitante] = useState<string>("Laura");
  const [multiMessages, setMultiMessages] = useState<WhatsAppMessageItem[]>([]);

  const [lastActionSummary, setLastActionSummary] = useState<string | null>(
    "Sistema Task-OS inicializado con nodo de enrutamiento determinista, índice universal y música de enfoque."
  );

  // Pomodoro state
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const [pomodoroTaskName, setPomodoroTaskName] = useState<string>(
    "Revisar y corregir los reconocimientos antes de enviarlos"
  );
  const [pomodoroTaskId, setPomodoroTaskId] = useState<number | null>(1);
  const [pomodoroMinutes, setPomodoroMinutes] = useState<number>(25);

  const [isLoading, setIsLoading] = useState(false);

  // Save tasks
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error("Failed to save ledger", e);
    }
  }, [tasks]);

  // Save global resources
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GLOBAL_RESOURCES, JSON.stringify(globalResources));
    } catch (e) {
      console.error("Failed to save global resources", e);
    }
  }, [globalResources]);

  // Save url library
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_URL_LIBRARY, JSON.stringify(urlLibrary));
    } catch (e) {
      console.error("Failed to save url library", e);
    }
  }, [urlLibrary]);

  // Save lonas orders
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LONAS, JSON.stringify(lonasOrders));
    } catch (e) {
      console.error("Failed to save lonas orders", e);
    }
  }, [lonasOrders]);

  // Save active task ID
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_TASK_ID, JSON.stringify(activeTaskId));
    } catch (_) {}
  }, [activeTaskId]);

  // Save contacts
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(contacts));
    } catch (e) {
      console.error("Failed to save contacts", e);
    }
  }, [contacts]);

  // Save tags
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TAGS, JSON.stringify(tags));
    } catch (e) {
      console.error("Failed to save tags", e);
    }
  }, [tags]);

  // Save solicitudes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SOLICITUDES, JSON.stringify(solicitudes));
    } catch (e) {
      console.error("Failed to save solicitudes", e);
    }
  }, [solicitudes]);

  // Real-time Firestore sync when authenticated
  useEffect(() => {
    const unsubAuth = initAuth((user) => {
      const unsubTasks = subscribeToFirestoreTasks(
        user.uid,
        (syncedTasks) => {
          if (syncedTasks.length > 0) setTasks(syncedTasks);
        },
        (err) => console.warn("Firestore tasks sync warning:", err)
      );

      const unsubGlobal = subscribeToGlobalResources(
        user.uid,
        (syncedGlobal) => {
          if (syncedGlobal.length > 0) setGlobalResources(syncedGlobal);
        },
        (err) => console.warn("Firestore global resources sync warning:", err)
      );

      const unsubUrlLib = subscribeToUrlLibrary(
        user.uid,
        (syncedUrls) => {
          if (syncedUrls.length > 0) setUrlLibrary(syncedUrls);
        },
        (err) => console.warn("Firestore url library sync warning:", err)
      );

      const unsubSolicitudes = subscribeToSolicitudes(
        user.uid,
        (synced) => {
          if (synced && synced.length > 0) setSolicitudes(synced);
        },
        (err) => console.warn("Firestore solicitudes sync warning:", err)
      );

      return () => {
        unsubTasks();
        unsubGlobal();
        unsubUrlLib();
        unsubSolicitudes();
      };
    });

    return () => unsubAuth();
  }, []);

  // Initialize Push Notifications status and foreground message listener
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsPushActive(getNotificationPermission() === "granted");
      registerMessagingServiceWorker();

      // Check if URL has ?openNotifications=true from a push notification click
      const params = new URLSearchParams(window.location.search);
      if (params.get("openNotifications") === "true") {
        setIsNotificationsModalOpen(true);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, "", cleanUrl);
      }

      let cleanup = () => {};
      listenForegroundMessages((payload) => {
        setLastActionSummary(`🔔 Alerta Push: ${payload.title}`);
      }).then((unsub) => {
        cleanup = unsub;
      });

      return () => cleanup();
    }
  }, []);

  // Keep essential task valid if tasks change
  useEffect(() => {
    const activeTasks = tasks.filter((t) => t.estado !== "Completado");
    if (activeTasks.length > 0) {
      if (!esencialTaskId || !tasks.some((t) => t.id === esencialTaskId && t.estado !== "Completado")) {
        setEsencialTaskId(activeTasks[0].id);
      }
    } else {
      setEsencialTaskId(null);
    }
  }, [tasks, esencialTaskId]);

  // Keep active task valid if tasks change
  useEffect(() => {
    if (activeTaskId !== null && !tasks.some((t) => t.id === activeTaskId)) {
      const firstActive = tasks.find((t) => t.estado !== "Completado");
      setActiveTaskId(firstActive ? firstActive.id : null);
    }
  }, [tasks, activeTaskId]);

  // Helper to push state to cloud
  const pushCloudState = async (
    email: string,
    curTasks: TaskItem[],
    curGlobal: GlobalResource[],
    curUrlLib: UrlLibraryItem[],
    curContacts: Contact[],
    curTags: TagItem[],
    curEsencial: number | null,
    curSecundarias: number[]
  ) => {
    try {
      const res = await fetch("/api/sync/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          tasks: curTasks,
          globalResources: curGlobal,
          urlLibrary: curUrlLib,
          contacts: curContacts,
          tags: curTags,
          esencialTaskId: curEsencial,
          secundariasTaskIds: curSecundarias,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncStatus((prev) => ({
          ...prev,
          email,
          isSyncing: false,
          lastSyncedAt: data.updatedAt || data.data?.updatedAt || new Date().toISOString(),
          error: null,
        }));
      }
    } catch (err: any) {
      console.warn("Cloud sync push error:", err);
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: err.message,
      }));
    }
  };

  // Initial pull from cloud for syncEmail
  useEffect(() => {
    let isMounted = true;

    async function pullCloudState() {
      if (!syncEmail) return;
      setSyncStatus((prev) => ({ ...prev, email: syncEmail, isSyncing: true, error: null }));

      try {
        const res = await fetch(`/api/sync/pull?email=${encodeURIComponent(syncEmail)}`);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();

        if (isMounted) {
          if (data.success && data.exists && data.data) {
            const cloud = data.data as CloudSyncPayload & {
              globalResources?: GlobalResource[];
              urlLibrary?: UrlLibraryItem[];
            };
            if (Array.isArray(cloud.tasks) && cloud.tasks.length > 0) {
              setTasks(cloud.tasks);
            }
            if (Array.isArray(cloud.globalResources) && cloud.globalResources.length > 0) {
              setGlobalResources(cloud.globalResources);
            }
            if (Array.isArray(cloud.urlLibrary) && cloud.urlLibrary.length > 0) {
              setUrlLibrary(cloud.urlLibrary);
            }
            if (Array.isArray(cloud.contacts) && cloud.contacts.length > 0) {
              setContacts(cloud.contacts);
            }
            if (Array.isArray(cloud.tags) && cloud.tags.length > 0) {
              setTags(cloud.tags);
            }
            if (typeof cloud.esencialTaskId === "number") {
              setEsencialTaskId(cloud.esencialTaskId);
            }
            if (Array.isArray(cloud.secundariasTaskIds)) {
              setSecundariasTaskIds(cloud.secundariasTaskIds);
            }
            setSyncStatus({
              email: syncEmail,
              isSyncing: false,
              lastSyncedAt: cloud.updatedAt || new Date().toISOString(),
              error: null,
            });
          } else {
            // First time this email connects or empty cloud: push current local state to cloud
            await pushCloudState(syncEmail, tasks, globalResources, urlLibrary, contacts, tags, esencialTaskId, secundariasTaskIds);
          }
        }
      } catch (err: any) {
        console.warn("Cloud sync pull offline or error:", err);
        if (isMounted) {
          setSyncStatus((prev) => ({
            ...prev,
            email: syncEmail,
            isSyncing: false,
            error: err.message,
          }));
        }
      }
    }

    pullCloudState();
    return () => {
      isMounted = false;
    };
  }, [syncEmail]);

  // Debounced auto-push whenever tasks, globalResources, urlLibrary, contacts, or tags change
  useEffect(() => {
    if (!syncEmail) return;

    const timer = setTimeout(() => {
      setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
      pushCloudState(syncEmail, tasks, globalResources, urlLibrary, contacts, tags, esencialTaskId, secundariasTaskIds);
    }, 1500);

    return () => clearTimeout(timer);
  }, [tasks, globalResources, urlLibrary, contacts, tags, esencialTaskId, secundariasTaskIds, syncEmail]);

  const handleChangeSyncEmail = (newEmail: string) => {
    setSyncEmail(newEmail);
    try {
      localStorage.setItem(STORAGE_KEY_USER_EMAIL, newEmail);
    } catch (_) {}
    setLastActionSummary(`Sincronización vinculada al correo ${newEmail}`);
  };

  const handleForceSync = async () => {
    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
    try {
      const res = await fetch(`/api/sync/pull?email=${encodeURIComponent(syncEmail)}`);
      const data = await res.json();
      if (data.success && data.exists && data.data) {
        const cloud = data.data as CloudSyncPayload & {
          globalResources?: GlobalResource[];
          urlLibrary?: UrlLibraryItem[];
        };
        if (Array.isArray(cloud.tasks)) setTasks(cloud.tasks);
        if (Array.isArray(cloud.globalResources)) setGlobalResources(cloud.globalResources);
        if (Array.isArray(cloud.urlLibrary)) setUrlLibrary(cloud.urlLibrary);
        if (Array.isArray(cloud.contacts)) setContacts(cloud.contacts);
        if (Array.isArray(cloud.tags)) setTags(cloud.tags);
        if (typeof cloud.esencialTaskId === "number") setEsencialTaskId(cloud.esencialTaskId);
        if (Array.isArray(cloud.secundariasTaskIds)) setSecundariasTaskIds(cloud.secundariasTaskIds);
      }
      await pushCloudState(syncEmail, tasks, globalResources, urlLibrary, contacts, tags, esencialTaskId, secundariasTaskIds);
      setLastActionSummary(`Sincronización manual completada con ${syncEmail}`);
    } catch (err: any) {
      console.error("Force sync failed:", err);
    }
  };

  // Solicitudes & Centro de Notificaciones Handlers
  const handleConvertSolicitudToTask = (solicitud: SolicitudItem) => {
    const nextId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
    const todayStr = new Date().toISOString().split("T")[0];

    // Determine domain intelligently
    let taskDominio = "General";
    const solLower = (solicitud.solicitante + " " + solicitud.titulo).toLowerCase();
    if (solLower.includes("laura")) taskDominio = "Laura";
    else if (solLower.includes("tiburón") || solLower.includes("lona") || solLower.includes("fgdll")) taskDominio = "FGDLL";
    else if (solLower.includes("universidad") || solLower.includes("diploma")) taskDominio = "Universidad";
    else if (solLower.includes("impresión") || solLower.includes("diseño")) taskDominio = "Diseño";

    const newTask: TaskItem = {
      id: nextId,
      solicitante: solicitud.solicitante,
      tarea: solicitud.titulo,
      estado: "Pendiente",
      fechaIngreso: todayStr,
      dominio: taskDominio,
      contacto: {
        nombre: solicitud.solicitante,
        telefono: solicitud.telefono,
      },
      notas: solicitud.descripcion,
      etiquetas:
        solicitud.prioridad === "Alta"
          ? ["Urgente", "Solicitud"]
          : ["Solicitud"],
    };

    const updatedTasks = [newTask, ...tasks];
    setTasks(updatedTasks);
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(updatedTasks));
    } catch (_) {}

    if (auth.currentUser) {
      saveTaskToFirestore(auth.currentUser.uid, newTask);
    }

    // Update solicitud status to ConvertidaEnTarea
    const updatedSolicitudes = solicitudes.map((s) =>
      s.id === solicitud.id
        ? {
            ...s,
            estado: "ConvertidaEnTarea" as const,
            leida: true,
            tareaIdAsociada: nextId,
          }
        : s
    );
    setSolicitudes(updatedSolicitudes);
    try {
      localStorage.setItem(STORAGE_KEY_SOLICITUDES, JSON.stringify(updatedSolicitudes));
    } catch (_) {}

    if (auth.currentUser) {
      const targetSol = updatedSolicitudes.find((s) => s.id === solicitud.id);
      if (targetSol) saveSolicitudToFirestore(auth.currentUser.uid, targetSol);
    }

    // Update backend store
    fetch(`/api/solicitudes/${solicitud.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estado: "ConvertidaEnTarea",
        leida: true,
        tareaIdAsociada: nextId,
        targetUserEmail: syncEmail,
      }),
    }).catch(() => {});

    setLastActionSummary(
      `✅ Solicitud de ${solicitud.solicitante} convertida en Tarea #${nextId} en el Ledger.`
    );
    playChime("success");
  };

  const handleUpdateSolicitud = (id: string, updates: Partial<SolicitudItem>) => {
    const updated = solicitudes.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setSolicitudes(updated);
    try {
      localStorage.setItem(STORAGE_KEY_SOLICITUDES, JSON.stringify(updated));
    } catch (_) {}

    const target = updated.find((s) => s.id === id);
    if (target && auth.currentUser) {
      saveSolicitudToFirestore(auth.currentUser.uid, target);
    }

    fetch(`/api/solicitudes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updates, targetUserEmail: syncEmail }),
    }).catch(() => {});
  };

  const handleDeleteSolicitud = (id: string) => {
    const target = solicitudes.find((s) => s.id === id);
    const updated = solicitudes.filter((s) => s.id !== id);
    setSolicitudes(updated);
    try {
      localStorage.setItem(STORAGE_KEY_SOLICITUDES, JSON.stringify(updated));
    } catch (_) {}

    if (auth.currentUser) {
      deleteSolicitudFromFirestore(auth.currentUser.uid, id);
    }

    if (target) {
      setUndoAction({
        id: `undo-sol-${Date.now()}`,
        message: `Solicitud de "${target.solicitante}" eliminada.`,
        onUndo: () => {
          setSolicitudes((prev) => [target, ...prev]);
          if (auth.currentUser) {
            saveSolicitudToFirestore(auth.currentUser.uid, target);
          }
          setLastActionSummary("Acción deshecha: Solicitud restaurada.");
          playChime("tick");
        },
      });
    }
  };

  const handleCreateSolicitud = async (
    newSolData: Omit<SolicitudItem, "id" | "fechaIngreso">
  ) => {
    const newId = `sol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newSolicitud: SolicitudItem = {
      ...newSolData,
      id: newId,
      fechaIngreso: new Date().toISOString(),
    };

    const updated = [newSolicitud, ...solicitudes];
    setSolicitudes(updated);
    try {
      localStorage.setItem(STORAGE_KEY_SOLICITUDES, JSON.stringify(updated));
    } catch (_) {}

    if (auth.currentUser) {
      saveSolicitudToFirestore(auth.currentUser.uid, newSolicitud);
    }

    // Call server to persist and prepare push & email record
    try {
      fetch("/api/solicitudes/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newSolicitud,
          targetUserEmail: syncEmail,
        }),
      }).catch(() => {});
    } catch (_) {}

    // Dispatch Native Push Notification (Service Worker banner + sound + vibration)
    await notifyNewSolicitud({
      id: newSolicitud.id,
      solicitante: newSolicitud.solicitante,
      titulo: newSolicitud.titulo,
      descripcion: newSolicitud.descripcion,
      prioridad: newSolicitud.prioridad,
      telefono: newSolicitud.telefono,
    });

    // Dispatch Email Alert (server + mailto)
    await triggerSolicitudEmailAlert(newSolicitud.id, syncEmail);

    setLastActionSummary(
      `🚨 Nueva solicitud de ${newSolicitud.solicitante} recibida. Notificación Push y Alerta Email despachadas.`
    );
    playChime("notification");
  };

  const handleImportBackup = async (data: TaskOSExportData) => {
    if (data.tasks && Array.isArray(data.tasks)) setTasks(data.tasks);
    if (data.globalResources && Array.isArray(data.globalResources)) setGlobalResources(data.globalResources);
    if (data.urlLibrary && Array.isArray(data.urlLibrary)) setUrlLibrary(data.urlLibrary);
    if (data.contacts && Array.isArray(data.contacts)) setContacts(data.contacts);
    if (data.tags && Array.isArray(data.tags)) setTags(data.tags);
    if (typeof data.esencialTaskId === "number") setEsencialTaskId(data.esencialTaskId);

    if (auth.currentUser) {
      if (data.tasks) await batchSyncTasksToFirestore(auth.currentUser.uid, data.tasks);
      if (data.globalResources) await batchSyncGlobalResourcesToFirestore(auth.currentUser.uid, data.globalResources);
      if (data.urlLibrary) await batchSyncUrlLibraryToFirestore(auth.currentUser.uid, data.urlLibrary);
    }

    await pushCloudState(
      syncEmail,
      data.tasks || tasks,
      data.globalResources || globalResources,
      data.urlLibrary || urlLibrary,
      data.contacts || contacts,
      data.tags || tags,
      data.esencialTaskId ?? esencialTaskId,
      secundariasTaskIds
    );

    setLastActionSummary("Respaldo JSON importado y sincronizado con éxito.");
  };

  // URL Library CRUD handlers
  const handleAddUrlItem = (item: Omit<UrlLibraryItem, "id" | "createdAt">) => {
    const newItem: UrlLibraryItem = {
      ...item,
      id: `url-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...urlLibrary];
    setUrlLibrary(updated);
    if (auth.currentUser) {
      saveUrlLibraryItemToFirestore(auth.currentUser.uid, newItem);
    }
    setLastActionSummary(`"${newItem.title}" agregada a la Biblioteca de URLs.`);
    playChime("success");
  };

  const handleUpdateUrlItem = (updatedItem: UrlLibraryItem) => {
    setUrlLibrary((prev) => prev.map((u) => (u.id === updatedItem.id ? updatedItem : u)));
    if (auth.currentUser) {
      saveUrlLibraryItemToFirestore(auth.currentUser.uid, updatedItem);
    }
    setLastActionSummary(`Enlace "${updatedItem.title}" actualizado.`);
  };

  const handleDeleteUrlItem = (id: string) => {
    const target = urlLibrary.find((u) => u.id === id);
    if (!target) return;
    setUrlLibrary((prev) => prev.filter((u) => u.id !== id));
    if (auth.currentUser) {
      deleteUrlLibraryItemFromFirestore(auth.currentUser.uid, id);
    }
    setUndoAction({
      id: `undo-delete-url-${Date.now()}`,
      message: `Se eliminó "${target.title}" de tu biblioteca.`,
      onUndo: () => {
        setUrlLibrary((prev) => [target, ...prev]);
        if (auth.currentUser) {
          saveUrlLibraryItemToFirestore(auth.currentUser.uid, target);
        }
        setLastActionSummary(`Acción deshecha: "${target.title}" restaurada.`);
        playChime("tick");
      },
    });
    setLastActionSummary(`Enlace eliminado de la biblioteca.`);
  };

  const handleAttachUrlToActiveTask = (url: string, title: string) => {
    if (!activeTaskId) {
      alert("Selecciona primero una tarea activa en el selector superior para adjuntar este enlace.");
      return;
    }
    const activeTask = tasks.find((t) => t.id === activeTaskId);
    if (!activeTask) return;

    const alreadyAttached = (activeTask.resources || []).some(
      (r) => r.url.toLowerCase() === url.toLowerCase()
    );
    if (alreadyAttached) {
      setLastActionSummary(`La URL ya está adjunta a la tarea #${activeTaskId}.`);
      return;
    }

    const updatedTasks = tasks.map((t) => {
      if (t.id === activeTaskId) {
        return {
          ...t,
          resources: [
            ...(t.resources || []),
            { url, title, addedAt: new Date().toISOString() },
          ],
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    const targetTask = updatedTasks.find((t) => t.id === activeTaskId);
    if (targetTask && auth.currentUser) {
      saveTaskToFirestore(auth.currentUser.uid, targetTask);
    }
    setLastActionSummary(`"${title}" adjuntado a la Tarea #${activeTaskId}.`);
    playChime("success");
  };

  const handleSendToPrint = (item: PrintItem) => {
    setCurrentPrintItem(item);
    setCurrentWorkspace("print");
    setLastActionSummary(`Documento "${item.titulo}" enviado a PRINT (🖨️).`);
    playChime("tick");
  };

  const handleSaveIncomeToFinanzas = (income: any) => {
    setLastActionSummary(`Comprobante guardado en Salud Financiera: ${income.concepto || ""}`);
    playChime("success");
  };

  const handleSaveToLonas = (order: Partial<LonasOrder>) => {
    const cliente = order.cliente;
    if (cliente?.nombre) {
      setLonasOrders((prev) => {
        const nextFolio = prev.length > 0 ? Math.max(...prev.map((o) => o.folio)) + 1 : 1;
        const newOrder: LonasOrder = {
          id: order.id || `lon-${Date.now()}`,
          folio: order.folio || nextFolio,
          cliente: {
            nombre: cliente.nombre,
            telefono: cliente.telefono || "",
            empresa: cliente.empresa || "Zona Jaguar",
          },
          items: order.items || [
            {
              id: `item-${Date.now()}`,
              descripcion: "Pedido desde comprobante / OUT",
              ancho: 1,
              alto: 1,
              cantidad: 1,
              m2: 1,
              costoPorM2: 50,
              precioVentaPorM2: 100,
              costoCalculado: 50,
              precioCalculado: order.total || 100,
              precioFinal: order.total || 100,
              costoFinal: 50,
            },
          ],
          subtotal: order.subtotal || order.total || 0,
          descuento: 0,
          total: order.total || 0,
          anticipo: order.anticipo || 0,
          pagos: [],
          saldo: order.saldo ?? Math.max(0, (order.total || 0) - (order.anticipo || 0)),
          estado: order.estado || "Cotización",
          fechaIngreso: new Date().toISOString().slice(0, 10),
          fechaEntregaEstimada: order.fechaEntregaEstimada || "Pendiente",
          driveUrl: order.driveUrl,
        };
        const updated = [newOrder, ...prev];
        try {
          localStorage.setItem(STORAGE_KEY_LONAS, JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });
    }
    setLastActionSummary(`Comprobante vinculado a Pedidos de Lonas: ${order.cliente?.nombre || ""}`);
    playChime("success");
  };

  const handleProcessInput = async (
    input: string,
    imageBase64?: string,
    imageMimeType?: string,
    selectedTags?: string[],
    preassignedCategory?: string,
    urlDestinationOverride?: "TASK" | "GLOBAL" | "URL_LIBRARY" | null
  ) => {
    setIsLoading(true);
    setLastActionSummary(null);

    // 1. Evaluate input deterministically through the Executive Router Node
    let routerResult;
    try {
      routerResult = await routeExecutiveInput(
        input,
        activeTaskId,
        tasks,
        globalResources,
        urlLibrary,
        urlDestinationOverride
      );
      setLastRouterOutput(routerResult.structuredOutput);
    } catch (routerErr) {
      console.warn("Router execution error, using standard fallback:", routerErr);
    }

    // Branch A: ROUTE_RESOURCE or SAVE_URL_LIBRARY (URLs detected)
    if (
      routerResult &&
      (routerResult.structuredOutput.action === "ROUTE_RESOURCE" ||
        routerResult.structuredOutput.action === "SAVE_URL_LIBRARY")
    ) {
      setIsLoading(false);
      const plans = routerResult.resourcePlans;
      const validNew = plans.filter((p) => !p.isDuplicate);

      if (validNew.length > 0) {
        if (routerResult.structuredOutput.destination.type === "URL_LIBRARY") {
          // Destination: Daily URL Library
          const newUrlItems: UrlLibraryItem[] = validNew.map((p) => ({
            id: `url-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            url: p.url,
            title: p.title,
            categoria: p.categoria || "Herramientas & Web",
            descripcion: p.descripcion,
            keywords: p.keywords,
            icon: p.icon || undefined,
            isFavorite: true,
            clicks: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));

          const updatedUrls = [...newUrlItems, ...urlLibrary];
          setUrlLibrary(updatedUrls);
          try {
            localStorage.setItem(STORAGE_KEY_URL_LIBRARY, JSON.stringify(updatedUrls));
          } catch (_) {}

          if (auth.currentUser) {
            newUrlItems.forEach((u) => saveUrlLibraryItemToFirestore(auth.currentUser!.uid, u));
          }

          // Register reversible undo action
          setUndoAction({
            id: `undo-url-${Date.now()}`,
            message: `Se guardó ${newUrlItems.length} enlace(s) en tu Biblioteca de URLs.`,
            onUndo: () => {
              setUrlLibrary((prev) =>
                prev.filter((u) => !newUrlItems.some((nu) => nu.id === u.id))
              );
              if (auth.currentUser) {
                newUrlItems.forEach((u) =>
                  deleteUrlLibraryItemFromFirestore(auth.currentUser!.uid, u.id)
                );
              }
              setLastActionSummary("Acción deshecha: Enlaces eliminados de la biblioteca.");
              playChime("tick");
            },
          });
        } else if (routerResult.structuredOutput.destination.type === "TASK" && activeTaskId) {
          const newResources: TaskResource[] = validNew.map((p) => ({
            url: p.url,
            title: p.title,
            addedAt: new Date().toISOString(),
          }));

          const updatedTasks = tasks.map((t) => {
            if (t.id === activeTaskId) {
              const curRes = t.resources || [];
              return { ...t, resources: [...curRes, ...newResources] };
            }
            return t;
          });

          setTasks(updatedTasks);
          const targetTask = updatedTasks.find((t) => t.id === activeTaskId);
          if (targetTask && auth.currentUser) {
            saveTaskToFirestore(auth.currentUser.uid, targetTask);
          }

          // Register reversible undo action
          setUndoAction({
            id: `undo-res-${Date.now()}`,
            message: `Se adjuntaron ${newResources.length} recurso(s) a la Tarea #${activeTaskId}.`,
            onUndo: () => {
              setTasks((prev) =>
                prev.map((t) => {
                  if (t.id === activeTaskId) {
                    const filtered = (t.resources || []).filter(
                      (r) => !newResources.some((added) => added.url.toLowerCase() === r.url.toLowerCase())
                    );
                    const reverted = { ...t, resources: filtered };
                    if (auth.currentUser) {
                      saveTaskToFirestore(auth.currentUser.uid, reverted);
                    }
                    return reverted;
                  }
                  return t;
                })
              );
              setLastActionSummary("Acción deshecha: Recursos retirados de la tarea.");
              playChime("tick");
            },
          });
        } else {
          // Global Resource routing
          const newGlobalItems: GlobalResource[] = validNew.map((p) => ({
            id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            url: p.url,
            title: p.title,
            keywords: p.keywords,
            savedAt: new Date().toISOString(),
          }));

          const mergedGlobal = [...newGlobalItems, ...globalResources];
          setGlobalResources(mergedGlobal);
          try {
            localStorage.setItem(STORAGE_KEY_GLOBAL_RESOURCES, JSON.stringify(mergedGlobal));
          } catch (_) {}

          if (auth.currentUser) {
            newGlobalItems.forEach((g) => saveGlobalResourceToFirestore(auth.currentUser!.uid, g));
          }

          // Register reversible undo action
          setUndoAction({
            id: `undo-global-${Date.now()}`,
            message: `Se indexaron ${newGlobalItems.length} recurso(s) en el Archivo Global.`,
            onUndo: () => {
              setGlobalResources((prev) => {
                const filtered = prev.filter(
                  (g) => !newGlobalItems.some((ng) => ng.id === g.id)
                );
                try {
                  localStorage.setItem(STORAGE_KEY_GLOBAL_RESOURCES, JSON.stringify(filtered));
                } catch (_) {}
                return filtered;
              });
              if (auth.currentUser) {
                newGlobalItems.forEach((g) =>
                  deleteGlobalResourceFromFirestore(auth.currentUser!.uid, g.id)
                );
              }
              setLastActionSummary("Acción deshecha: Recursos eliminados del archivo global.");
              playChime("tick");
            },
          });
        }
      }

      setLastActionSummary(routerResult.notification);
      playChime("success");
      return;
    }

    // Branch B: UNIVERSAL_SEARCH
    if (routerResult && routerResult.structuredOutput.action === "UNIVERSAL_SEARCH") {
      setIsLoading(false);
      const query = routerResult.structuredOutput.payload.searchQuery || input;
      setUniversalSearchInitialQuery(query);
      setIsUniversalSearchOpen(true);
      setLastActionSummary(routerResult.notification);
      playChime("tick");
      return;
    }

    // Branch C: CREATE_TASK (Standard Task creation pipeline)
    const todayStr = new Date().toISOString().split("T")[0];
    const previousMaxId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) : 0;

    try {
      const response = await fetch("/api/task-os/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          currentTasks: tasks,
          currentDate: todayStr,
          imageBase64,
          imageMimeType,
          contacts,
          selectedTags,
          preassignedCategory,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data: TaskOSResponse = await response.json();

      if (data.tasks) {
        const newTasks = data.tasks.filter((t) => t.id > previousMaxId);

        // Ensure new tasks keep selectedTags if applicable
        if (selectedTags && selectedTags.length > 0) {
          if (newTasks.length > 0) {
            newTasks.forEach((target) => {
              if (!target.etiquetas || target.etiquetas.length === 0) {
                target.etiquetas = [...selectedTags];
              }
            });
          } else {
            const maxId = Math.max(...data.tasks.map((t) => t.id));
            const target = data.tasks.find((t) => t.id === maxId);
            if (target && (!target.etiquetas || target.etiquetas.length === 0)) {
              target.etiquetas = [...selectedTags];
            }
          }
        }

        // Ensure new tasks receive preassigned category if specified
        if (preassignedCategory) {
          if (newTasks.length > 0) {
            newTasks.forEach((target) => {
              target.dominio = preassignedCategory;
            });
          } else if (data.tasks.length > tasks.length) {
            const latest = data.tasks[data.tasks.length - 1];
            if (latest) latest.dominio = preassignedCategory;
          }
        }

        setTasks(data.tasks);

        // Sync new tasks to Firestore if user logged in
        if (auth.currentUser && newTasks.length > 0) {
          newTasks.forEach((nt) => saveTaskToFirestore(auth.currentUser!.uid, nt));
        }

        // Setup undo for task creation
        if (newTasks.length > 0) {
          const createdIds = newTasks.map((t) => t.id);
          setUndoAction({
            id: `undo-task-${Date.now()}`,
            message: `Tarea #${createdIds[0]} creada con éxito.`,
            onUndo: () => {
              setTasks((prev) => prev.filter((t) => !createdIds.includes(t.id)));
              setLastActionSummary("Acción deshecha: Tarea eliminada del Ledger.");
              playChime("tick");
            },
          });
        }
      }

      if (data.tareaEsencialId !== undefined) {
        setEsencialTaskId(data.tareaEsencialId);
      }

      if (data.tareasSecundariasIds !== undefined) {
        setSecundariasTaskIds(data.tareasSecundariasIds);
      }

      if (data.mensajeParaEnviar !== undefined) {
        setLastMessage(data.mensajeParaEnviar);
      }

      // Populate multiple messages queue if returned
      if (data.mensajesMultiples && data.mensajesMultiples.length > 0) {
        const mapped: WhatsAppMessageItem[] = data.mensajesMultiples.map((m, idx) => ({
          id: `msg-${Date.now()}-${idx}`,
          destinatario: m.destinatario,
          telefono: m.telefono,
          mensaje: m.mensaje,
          enviado: false,
        }));
        setMultiMessages(mapped);
      }

      if (data.resumenAccion) {
        setLastActionSummary(data.resumenAccion);
      }

      // Check if Pomodoro requested
      if (data.activarPomodoro) {
        const targetTask = data.pomodoroTarea || "Sesión de Enfoque";
        setPomodoroTaskName(targetTask);
        if (data.pomodoroMinutos) setPomodoroMinutes(data.pomodoroMinutos);

        const matched = data.tasks.find((t) =>
          targetTask.toLowerCase().includes(t.tarea.toLowerCase().slice(0, 15))
        );
        setPomodoroTaskId(matched ? matched.id : null);
        setIsPomodoroActive(true);
        playChime("tick");
      }

      playChime("success");
    } catch (err) {
      console.error("Error processing input:", err);
      setLastActionSummary("Error al conectar con el servidor. Revisa tu conexión.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetStatus = (
    id: number,
    newStatus: "Pendiente" | "En Proceso" | "Completado"
  ) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = {
            ...t,
            estado: newStatus,
            fechaCompletado:
              newStatus === "Completado"
                ? t.fechaCompletado || new Date().toISOString()
                : undefined,
          };
          if (auth.currentUser) {
            saveTaskToFirestore(auth.currentUser.uid, updated);
          }
          // If task completed and delegated by someone else, generate delivery notice (Ley 16)
          if (newStatus === "Completado" && t.solicitante && t.solicitante.toLowerCase() !== "pepe") {
            const reply = `Ya quedó listo lo que me pediste (${t.tarea}). Te lo comparto por aquí.`;
            setLastMessage(reply);
            setLastSolicitante(t.solicitante);

            // Also queue in multiMessages
            const contactMatch = contacts.find((c) =>
              c.nombre.toLowerCase().includes(t.solicitante.toLowerCase())
            );
            setMultiMessages((prevMsgs) => [
              {
                id: `deliv-${Date.now()}`,
                destinatario: t.solicitante,
                telefono: contactMatch?.telefono || t.contacto?.telefono,
                mensaje: reply,
                tareaId: t.id,
                enviado: false,
              },
              ...prevMsgs,
            ]);

            setLastActionSummary(`Tarea #${t.id} completada. Aviso de entrega generado para ${t.solicitante}.`);
          } else if (newStatus === "Completado") {
            setLastActionSummary(`Tarea #${t.id} completada.`);
          }
          return updated;
        }
        return t;
      })
    );
    playChime(newStatus === "Completado" ? "work_done" : "tick");
  };

  const handleToggleStatus = (id: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const nextStatus =
      task.estado === "Pendiente"
        ? "En Proceso"
        : task.estado === "En Proceso"
        ? "Completado"
        : "Pendiente";
    handleSetStatus(id, nextStatus);
  };

  const handleStartFocus = (task: TaskItem) => {
    setPomodoroTaskName(task.tarea);
    setPomodoroTaskId(task.id);
    setPomodoroMinutes(25);
    setIsPomodoroActive(true);
    setLastActionSummary(`Sesión de enfoque activada para: ${task.tarea}`);
    playChime("tick");
  };

  const handleCompleteTaskFromPomodoro = (taskId: number | null, taskName: string) => {
    if (taskId) {
      handleSetStatus(taskId, "Completado");
    } else {
      const found = tasks.find((t) => t.tarea === taskName);
      if (found) {
        handleSetStatus(found.id, "Completado");
      }
    }
    setLastActionSummary(`¡Enfoque completado con éxito! Tarea marcada como Completada.`);
  };

  const handleUpdateTaskFechaLimite = (id: number, fechaLimite: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, fechaLimite: fechaLimite || undefined };
          if (auth.currentUser) {
            saveTaskToFirestore(auth.currentUser.uid, updated);
          }
          return updated;
        }
        return t;
      })
    );
    setLastActionSummary(
      fechaLimite
        ? `Fecha límite de la tarea #${id} actualizada al ${fechaLimite}.`
        : `Fecha límite de la tarea #${id} eliminada.`
    );
  };

  const handleResetLedger = () => {
    if (window.confirm("¿Deseas restablecer el Ledger y contactos a las opciones iniciales?")) {
      setTasks(INITIAL_TASKS);
      setContacts(INITIAL_CONTACTS);
      setEsencialTaskId(1);
      setSecundariasTaskIds([2]);
      setLastMessage(
        "Sí, ya lo tengo anotado. Reviso los reconocimientos antes de enviarlos y te aviso cuando queden listos."
      );
      setLastActionSummary("Ledger y contactos restablecidos a valores iniciales.");
    }
  };

  // Contacts handlers
  const handleAddContact = (newContact: Omit<Contact, "id">) => {
    const contact: Contact = {
      ...newContact,
      id: `c-${Date.now()}`,
    };
    setContacts((prev) => [...prev, contact]);
    setLastActionSummary(`Contacto ${contact.nombre} añadido a la agenda.`);
  };

  const handleUpdateContact = (updated: Contact) => {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setLastActionSummary(`Contacto ${updated.nombre} actualizado.`);
  };

  const handleDeleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setLastActionSummary("Contacto eliminado de la agenda.");
  };

  const handleBulkAddContacts = (newContacts: Contact[]) => {
    setContacts((prev) => [...prev, ...newContacts]);
    setLastActionSummary(`${newContacts.length} contactos importados con etiquetas a la agenda.`);
  };

  const handleSelectContactForMessage = (c: Contact) => {
    const msg = lastMessage && lastMessage !== "No aplica."
      ? lastMessage
      : `Hola ${c.nombre}, te escribo respecto al seguimiento de las tareas.`;
    setLastMessage(msg);
    setLastSolicitante(c.nombre);
    setMultiMessages((prev) => [
      {
        id: `contact-msg-${Date.now()}`,
        destinatario: c.nombre,
        telefono: c.telefono,
        mensaje: msg,
        enviado: false,
      },
      ...prev,
    ]);
  };

  const handleMessageTaskContact = (task: TaskItem) => {
    const contactMatch = contacts.find((c) =>
      c.nombre.toLowerCase().includes(task.solicitante.toLowerCase())
    );
    const phone = contactMatch?.telefono || task.contacto?.telefono;
    const msg = `Hola ${task.solicitante}, sobre la tarea: "${task.tarea}"...`;

    setLastMessage(msg);
    setLastSolicitante(task.solicitante);
    setMultiMessages((prev) => [
      {
        id: `task-msg-${Date.now()}`,
        destinatario: task.solicitante,
        telefono: phone,
        mensaje: msg,
        tareaId: task.id,
        enviado: false,
      },
      ...prev,
    ]);
    setLastActionSummary(`Mensaje preparado para ${task.solicitante}.`);
  };

  const handleMarkMessageSent = (id: string) => {
    setMultiMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enviado: true } : m))
    );
  };

  // Tags handlers
  const handleAddTag = (newTag: Omit<TagItem, "id">) => {
    const created: TagItem = {
      ...newTag,
      id: `tag-${Date.now()}`,
    };
    setTags((prev) => [...prev, created]);
    setLastActionSummary(`Etiqueta "${created.nombre}" creada.`);
  };

  const handleUpdateTag = (updated: TagItem) => {
    setTags((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setLastActionSummary(`Etiqueta "${updated.nombre}" actualizada.`);
  };

  const handleDeleteTag = (id: string) => {
    const target = tags.find((t) => t.id === id);
    setTags((prev) => prev.filter((t) => t.id !== id));
    // Also remove tag from any task that has it
    if (target) {
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          etiquetas: t.etiquetas?.filter((e) => e !== target.nombre),
        }))
      );
    }
    setLastActionSummary(`Etiqueta eliminada.`);
  };

  const handleResetTags = () => {
    setTags(DEFAULT_TAGS);
    setLastActionSummary(`Etiquetas restablecidas a valores predeterminados.`);
  };

  const handleToggleTaskTag = (taskId: number, tagName: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const current = t.etiquetas || [];
          const exists = current.includes(tagName);
          const next = exists
            ? current.filter((e) => e !== tagName)
            : [...current, tagName];
          const updated = { ...t, etiquetas: next };
          if (auth.currentUser) {
            saveTaskToFirestore(auth.currentUser.uid, updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  const handleUpdateTaskNotes = (taskId: number, notes: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updated = { ...t, notas: notes };
          if (auth.currentUser) {
            saveTaskToFirestore(auth.currentUser.uid, updated);
          }
          return updated;
        }
        return t;
      })
    );
    setLastActionSummary(`Observaciones actualizadas para la tarea #${taskId}.`);
  };

  // Google Workspace & Firebase Handlers
  const handleImportGoogleContacts = (imported: Contact[]) => {
    setContacts((prev) => {
      const existingNames = new Set(prev.map((c) => c.nombre.toLowerCase().trim()));
      const filteredNew = imported.filter(
        (c) => !existingNames.has(c.nombre.toLowerCase().trim())
      );
      const merged = [...prev, ...filteredNew];
      try {
        localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(merged));
      } catch (e) {
        console.error("Error saving contacts", e);
      }
      return merged;
    });
    setLastActionSummary(`Se importaron contactos de Google a tu agenda.`);
  };

  const handleImportGoogleTasks = (importedTasks: TaskItem[]) => {
    setTasks((prev) => {
      const merged = [...prev, ...importedTasks];
      try {
        localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(merged));
      } catch (e) {
        console.error("Error saving tasks", e);
      }
      return merged;
    });
    setLastActionSummary(`Se agregaron ${importedTasks.length} tareas desde Google Tasks.`);
  };

  const handleTasksSyncedFromFirestore = (syncedTasks: TaskItem[]) => {
    setTasks(syncedTasks);
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(syncedTasks));
    } catch (e) {
      console.error("Error saving synced tasks", e);
    }
    setLastActionSummary(`Ledger sincronizado con Firebase Firestore.`);
  };

  const essentialTask = tasks.find((t) => t.id === esencialTaskId);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans selection:bg-amber-200 selection:text-stone-900">
      {/* Global Header */}
      <Header
        onOpenPomodoro={() => {
          if (!isPomodoroActive) {
            const taskToFocus = essentialTask?.tarea || "Sesión de Enfoque";
            setPomodoroTaskName(taskToFocus);
            setPomodoroTaskId(essentialTask?.id || null);
          }
          setIsPomodoroActive(!isPomodoroActive);
        }}
        isPomodoroActive={isPomodoroActive}
        essentialTaskName={essentialTask?.tarea}
        onOpenContacts={() => setIsContactsModalOpen(true)}
        onOpenTags={() => setIsTagsModalOpen(true)}
        onResetLedger={handleResetLedger}
        syncStatus={syncStatus}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenConnectionMenu={() => setIsConnectionMenuOpen(true)}
        onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
        onOpenUniversalSearch={() => setIsUniversalSearchOpen(true)}
        onOpenExportImport={() => setIsExportImportOpen(true)}
        onOpenUrlLibrary={() => setCurrentWorkspace("urls")}
        urlCount={urlLibrary.length}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        isPushActive={isPushActive}
        unreadSolicitudesCount={solicitudes.filter((s) => !s.leida || s.estado === "Nueva").length}
      />

      {/* Ecosystem Navigation Bar (🔥 • 💻 • 🤑 • 🔗 • 🖨️ • ⏱️) */}
      <div className="border-b border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md sticky top-16 z-20">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Task: 🔥 */}
            <button
              type="button"
              id="ws-tab-task-os"
              onClick={() => setCurrentWorkspace("task-os")}
              className={`p-2.5 sm:px-3.5 sm:py-2 rounded-2xl text-base sm:text-lg font-black flex items-center justify-center transition-all shrink-0 min-h-[44px] min-w-[44px] relative active:scale-95 ${
                currentWorkspace === "task-os"
                  ? "bg-[#042f66] text-white shadow-md shadow-[#042f66]/25 ring-2 ring-[#042f66]/20"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
              title="Task: 🔥"
              aria-label="Task: 🔥"
            >
              <span>🔥</span>
              {tasks.filter((t) => t.estado !== "Completado").length > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-[#f2ad00] text-[#1d1d1b] text-[9px] font-black leading-tight shadow-xs">
                  {tasks.filter((t) => t.estado !== "Completado").length}
                </span>
              )}
            </button>

            {/* URLs: 🔗 */}
            <button
              type="button"
              id="ws-tab-urls"
              onClick={() => setCurrentWorkspace("urls")}
              className={`p-2.5 sm:px-3.5 sm:py-2 rounded-2xl text-base sm:text-lg font-black flex items-center justify-center transition-all shrink-0 min-h-[44px] min-w-[44px] relative active:scale-95 ${
                currentWorkspace === "urls"
                  ? "bg-[#042f66] text-white shadow-md shadow-[#042f66]/25 ring-2 ring-[#042f66]/20"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
              title="URLs: 🔗"
              aria-label="URLs: 🔗"
            >
              <span>🔗</span>
              {urlLibrary.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-[#f2ad00] text-[#1d1d1b] text-[9px] font-black">
                  {urlLibrary.length}
                </span>
              )}
            </button>

            {/* Lonas: 💻 */}
            <button
              type="button"
              id="ws-tab-lonas"
              onClick={() => setCurrentWorkspace("lonas")}
              className={`p-2.5 sm:px-3.5 sm:py-2 rounded-2xl text-base sm:text-lg font-black flex items-center justify-center transition-all shrink-0 min-h-[44px] min-w-[44px] active:scale-95 ${
                currentWorkspace === "lonas"
                  ? "bg-[#042f66] text-white shadow-md shadow-[#042f66]/25 ring-2 ring-[#042f66]/20"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
              title="Lonas: 💻"
              aria-label="Lonas: 💻"
            >
              <span>💻</span>
            </button>

            {/* Salud Financiera: 🤑 */}
            <button
              type="button"
              id="ws-tab-finanzas"
              onClick={() => setCurrentWorkspace("finanzas")}
              className={`p-2.5 sm:px-3.5 sm:py-2 rounded-2xl text-base sm:text-lg font-black flex items-center justify-center transition-all shrink-0 min-h-[44px] min-w-[44px] active:scale-95 ${
                currentWorkspace === "finanzas"
                  ? "bg-[#042f66] text-white shadow-md shadow-[#042f66]/25 ring-2 ring-[#042f66]/20"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
              title="Salud Financiera: 🤑"
              aria-label="Salud Financiera: 🤑"
            >
              <span>🤑</span>
            </button>

            {/* Print: 🖨️ */}
            <button
              type="button"
              id="ws-tab-print"
              onClick={() => setCurrentWorkspace("print")}
              className={`p-2.5 sm:px-3.5 sm:py-2 rounded-2xl text-base sm:text-lg font-black flex items-center justify-center transition-all shrink-0 min-h-[44px] min-w-[44px] active:scale-95 ${
                currentWorkspace === "print"
                  ? "bg-[#042f66] text-white shadow-md shadow-[#042f66]/25 ring-2 ring-[#042f66]/20"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
              title="Print: 🖨️"
              aria-label="Print: 🖨️"
            >
              <span>🖨️</span>
            </button>

            {/* Pomodoro: ⏱️ */}
            <button
              type="button"
              id="ws-tab-pomodoro"
              onClick={() => {
                setCurrentWorkspace("pomodoro");
                setIsPomodoroActive(true);
              }}
              className={`p-2.5 sm:px-3.5 sm:py-2 rounded-2xl text-base sm:text-lg font-black flex items-center justify-center transition-all shrink-0 min-h-[44px] min-w-[44px] active:scale-95 ${
                currentWorkspace === "pomodoro"
                  ? "bg-[#042f66] text-white shadow-md shadow-[#042f66]/25 ring-2 ring-[#042f66]/20"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
              title="Pomodoro: ⏱️"
              aria-label="Pomodoro: ⏱️"
            >
              <span>⏱️</span>
            </button>

            {/* Rendimiento Semanal: 📊 */}
            <button
              type="button"
              id="ws-tab-analytics"
              onClick={() => setCurrentWorkspace("analytics")}
              className={`p-2.5 sm:px-3.5 sm:py-2 rounded-2xl text-base sm:text-lg font-black flex items-center justify-center transition-all shrink-0 min-h-[44px] min-w-[44px] active:scale-95 ${
                currentWorkspace === "analytics"
                  ? "bg-[#042f66] text-white shadow-md shadow-[#042f66]/25 ring-2 ring-[#042f66]/20"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
              title="Rendimiento Semanal: 📊"
              aria-label="Rendimiento Semanal: 📊"
            >
              <span>📊</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-bold text-stone-500">
              <Cloud size={13} className="text-emerald-500" />
              Sincronizado: {syncEmail}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-6 pb-28 md:pb-12">
        {/* Render Workspace based on tab selection */}
        {currentWorkspace === "urls" ? (
          <UrlLibraryOS
            urls={urlLibrary}
            activeTaskId={activeTaskId}
            tasks={tasks}
            lonasOrders={lonasOrders}
            onAddUrl={handleAddUrlItem}
            onUpdateUrl={handleUpdateUrlItem}
            onDeleteUrl={handleDeleteUrlItem}
            onAttachToActiveTask={handleAttachUrlToActiveTask}
            onNavigateToLonas={() => setCurrentWorkspace("lonas")}
            onNavigateToPrint={handleSendToPrint}
            onSendToProcessor={(text) => {
              setCurrentWorkspace("task-os");
              setTimeout(() => {
                const el = document.getElementById("task-os-input") as HTMLTextAreaElement;
                if (el) {
                  el.value = text;
                  el.focus();
                }
              }, 50);
            }}
          />
        ) : currentWorkspace === "lonas" ? (
          <LonasOS
            userEmail={syncEmail}
            onSendToPrint={handleSendToPrint}
            onNavigateToFinanzas={() => setCurrentWorkspace("finanzas")}
            onNavigateToUrls={() => setCurrentWorkspace("urls")}
            onSaveUrlToLibrary={(item) => handleAddUrlItem(item)}
          />
        ) : currentWorkspace === "finanzas" ? (
          <SaludFinancieraOS
            userEmail={syncEmail}
            onSendToPrint={handleSendToPrint}
            onNavigateToLonas={() => setCurrentWorkspace("lonas")}
          />
        ) : currentWorkspace === "print" ? (
          <PrintOS
            currentPrintItem={currentPrintItem}
            onSaveToFinanzas={handleSaveIncomeToFinanzas}
            onSaveToLonas={handleSaveToLonas}
            onSwitchWorkspace={(ws) => setCurrentWorkspace(ws)}
          />
        ) : currentWorkspace === "pomodoro" ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  MÓDULO DE FOCO ABSOLUTO • LEY 27
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-stone-950 dark:text-white tracking-tight">
                  ⏱️ Sesión Pomodoro (Enfoque Total)
                </h2>
                <p className="text-xs text-stone-500">
                  Protección contra interrupciones, temporizador con alarma automática y sincronización de música
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentWorkspace("analytics")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs transition-transform active:scale-95"
                >
                  <span>📊 Ver Rendimiento Semanal</span>
                </button>
                <button
                  onClick={() => setCurrentWorkspace("task-os")}
                  className="px-4 py-2 rounded-2xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-bold text-xs"
                >
                  Volver a Task-OS
                </button>
              </div>
            </div>
            <PomodoroArtifact
              taskName={pomodoroTaskName}
              taskId={pomodoroTaskId}
              initialMinutes={pomodoroMinutes}
              onCompleteTask={handleCompleteTaskFromPomodoro}
              onClose={() => setCurrentWorkspace("task-os")}
            />
          </div>
        ) : currentWorkspace === "analytics" ? (
          <WeeklyPerformanceDashboard
            tasks={tasks}
            onOpenPomodoro={() => {
              setCurrentWorkspace("pomodoro");
              setIsPomodoroActive(true);
            }}
            onSelectTask={(id) => {
              setCurrentWorkspace("task-os");
              setTimeout(() => {
                const el = document.getElementById(`task-row-${id}`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 100);
            }}
            onClose={() => setCurrentWorkspace("task-os")}
          />
        ) : (
          <>
            {/* Action feedback bar if present */}
            {lastActionSummary && (
              <div
                id="task-os-action-banner"
                className="rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-2.5 flex items-center justify-between text-xs text-stone-600 dark:text-stone-300"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-500 shrink-0" />
                  <span>{lastActionSummary}</span>
                </div>
                <button
                  onClick={() => setLastActionSummary(null)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Top Split: Executive Input (with active task context selector & tags) + Output WhatsApp Message */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 space-y-3">
                {/* Active Task Context Selector (Ley del Foco) */}
                <ActiveTaskSelector
                  activeTaskId={activeTaskId}
                  tasks={tasks}
                  onSelectActiveTask={(taskId) => {
                    setActiveTaskId(taskId);
                    playChime("tick");
                  }}
                  onOpenUniversalSearch={() => setIsUniversalSearchOpen(true)}
                  onOpenExportImport={() => setIsExportImportOpen(true)}
                />

                <ExecutiveInput
                  onSubmit={handleProcessInput}
                  isLoading={isLoading}
                  availableTags={tags}
                  onOpenManageTags={() => setIsTagsModalOpen(true)}
                  activeTaskTitle={activeTaskId && tasks.find((t) => t.id === activeTaskId) ? tasks.find((t) => t.id === activeTaskId)!.tarea : null}
                />

                {/* Internal Structured Router Log */}
                {lastRouterOutput && (
                  <RouterLogViewer lastOutput={lastRouterOutput} />
                )}
              </div>

              <div className="lg:col-span-5 space-y-4">
                <MessageOutputCard
                  message={lastMessage}
                  solicitante={lastSolicitante}
                  multiMessages={multiMessages}
                  contacts={contacts}
                  tasks={tasks}
                  lonasOrders={lonasOrders}
                  onOpenContactsModal={() => setIsContactsModalOpen(true)}
                  onMarkSent={handleMarkMessageSent}
                  onSendToPrint={handleSendToPrint}
                  onSaveToFinanzas={handleSaveIncomeToFinanzas}
                  onSaveToLonas={handleSaveToLonas}
                />

                {/* Foco status widget */}
                {essentialTask && (
                  <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="p-1.5 rounded-lg bg-amber-500 text-stone-950 font-bold mt-0.5">
                        <Flame size={14} />
                      </span>
                      <div>
                        <span className="font-semibold text-amber-950 dark:text-amber-200 uppercase tracking-wider text-[10px]">
                          Prioridad Principal (Ley 8)
                        </span>
                        <p className="font-medium text-stone-800 dark:text-stone-200 line-clamp-1">
                          #{essentialTask.id}: {essentialTask.tarea}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartFocus(essentialTask)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold transition-all shrink-0 active:scale-95"
                    >
                      Enfocar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Pomodoro Artifact Section (Ley 27) */}
            {isPomodoroActive && (
              <div className="pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      ⏱️ Sesión de Enfoque Activa (Módulo Pomodoro • Ley 27)
                    </h3>
                  </div>
                </div>
                <PomodoroArtifact
                  taskName={pomodoroTaskName}
                  taskId={pomodoroTaskId}
                  initialMinutes={pomodoroMinutes}
                  onCompleteTask={handleCompleteTaskFromPomodoro}
                  onClose={() => setIsPomodoroActive(false)}
                />
              </div>
            )}

            {/* Ledger Maestro de Tareas (Ley 1) */}
            <div className="pt-2">
              <LedgerTable
                tasks={tasks}
                esencialTaskId={esencialTaskId}
                secundariasTaskIds={secundariasTaskIds}
                availableTags={tags}
                onToggleStatus={handleToggleStatus}
                onSetStatus={handleSetStatus}
                onStartFocus={handleStartFocus}
                onSetEsencial={(id) => setEsencialTaskId(id)}
                onMessageContact={handleMessageTaskContact}
                onToggleTaskTag={handleToggleTaskTag}
                onOpenManageTags={() => setIsTagsModalOpen(true)}
                onUpdateTaskNotes={handleUpdateTaskNotes}
                onUpdateTaskFechaLimite={handleUpdateTaskFechaLimite}
                onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
              />
            </div>
          </>
        )}
      </main>

      {/* Persistent Focus Music Player Engine (Plays continuously across all portal tabs) */}
      <WorkMusicPlayer
        isPomodoroActive={isPomodoroActive}
        currentWorkspace={currentWorkspace}
        onNavigateToPomodoro={() => {
          setCurrentWorkspace("pomodoro");
          setIsPomodoroActive(true);
        }}
      />

      {/* Google Workspace & Firebase Hub Modal */}
      <GoogleWorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        tasks={tasks}
        contacts={contacts}
        onImportContacts={handleImportGoogleContacts}
        onImportTasks={handleImportGoogleTasks}
        onTasksSynced={handleTasksSyncedFromFirestore}
        onUpdateTasks={(updated) => {
          setTasks(updated);
          if (auth.currentUser) {
            batchSyncTasksToFirestore(auth.currentUser.uid, updated);
          }
          try {
            localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(updated));
          } catch (e) {
            console.error("Error saving tasks", e);
          }
        }}
      />

      {/* Contacts Management Modal */}
      <ContactsModal
        isOpen={isContactsModalOpen}
        onClose={() => setIsContactsModalOpen(false)}
        contacts={contacts}
        tags={tags}
        onAddContact={handleAddContact}
        onUpdateContact={handleUpdateContact}
        onDeleteContact={handleDeleteContact}
        onSelectContactForMessage={handleSelectContactForMessage}
        onBulkAddContacts={handleBulkAddContacts}
        onOpenGoogleContacts={() => {
          setIsContactsModalOpen(false);
          setIsWorkspaceModalOpen(true);
        }}
      />

      {/* Tags Management Modal */}
      <TagsModal
        isOpen={isTagsModalOpen}
        onClose={() => setIsTagsModalOpen(false)}
        tags={tags}
        onAddTag={handleAddTag}
        onUpdateTag={handleUpdateTag}
        onDeleteTag={handleDeleteTag}
        onResetDefaultTags={handleResetTags}
      />

      {/* Cloud Synchronization Modal (Phone ↔ PC) */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncStatus={syncStatus}
        onChangeEmail={handleChangeSyncEmail}
        onForceSync={handleForceSync}
        tasks={tasks}
        esencialTaskId={esencialTaskId}
        secundariasTaskIds={secundariasTaskIds}
      />

      {/* Universal Search Modal (Motor de Recuperación Unificada) */}
      <UniversalSearchModal
        isOpen={isUniversalSearchOpen}
        initialQuery={universalSearchInitialQuery}
        onClose={() => setIsUniversalSearchOpen(false)}
        tasks={tasks}
        globalResources={globalResources}
        urlLibrary={urlLibrary}
        onSelectTask={(id) => {
          setActiveTaskId(id);
          const el = document.getElementById(`task-row-${id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }}
      />

      {/* Export / Import JSON Portability Backup Modal */}
      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        tasks={tasks}
        globalResources={globalResources}
        urlLibrary={urlLibrary}
        contacts={contacts}
        tags={tags}
        esencialTaskId={esencialTaskId}
        onImportData={handleImportBackup}
      />

      {/* Reversible Action Toast (Deshacer) */}
      <UndoToast
        action={undoAction}
        onDismiss={() => setUndoAction(null)}
      />

      {/* Centro de Notificaciones & Solicitudes Modal (Push + Email) */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        userEmail={syncEmail}
        solicitudes={solicitudes}
        onConvertSolicitudToTask={handleConvertSolicitudToTask}
        onUpdateSolicitud={handleUpdateSolicitud}
        onDeleteSolicitud={handleDeleteSolicitud}
        onCreateSolicitud={handleCreateSolicitud}
      />

      {/* Mobile-First Bottom Navigation Bar */}
      <MobileNavBar
        activeCount={tasks.filter((t) => t.estado !== "Completado").length}
        urlsCount={urlLibrary.length}
        isPomodoroActive={isPomodoroActive}
        syncStatus={syncStatus}
        currentWorkspace={currentWorkspace}
        onChangeWorkspace={setCurrentWorkspace}
        onNewTaskClick={() => {
          if (currentWorkspace !== "task-os") setCurrentWorkspace("task-os");
          setTimeout(() => {
            const el = document.getElementById("task-os-input");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.focus();
            }
          }, 50);
        }}
        onOpenPomodoro={() => {
          if (!isPomodoroActive) {
            const taskToFocus = essentialTask?.tarea || "Sesión de Enfoque";
            setPomodoroTaskName(taskToFocus);
            setPomodoroTaskId(essentialTask?.id || null);
          }
          setIsPomodoroActive(!isPomodoroActive);
        }}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenConnectionMenu={() => setIsConnectionMenuOpen(true)}
        onOpenContacts={() => setIsContactsModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        unreadSolicitudesCount={solicitudes.filter((s) => !s.leida || s.estado === "Nueva").length}
        onScrollToLedger={() => {
          if (currentWorkspace !== "task-os") setCurrentWorkspace("task-os");
          setTimeout(() => {
            const el = document.getElementById("ledger-maestro-section");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }, 50);
        }}
      />

      {/* Unified Connection & Sync Menu Modal (Mobile-first iPhone 16 Pro Max & Desktop Hub) */}
      <ConnectionSyncMenuModal
        isOpen={isConnectionMenuOpen}
        onClose={() => setIsConnectionMenuOpen(false)}
        syncStatus={syncStatus}
        isPushActive={isPushActive}
        unreadSolicitudesCount={solicitudes.filter((s) => !s.leida || s.estado === "Nueva").length}
        onForceSync={handleForceSync}
        onOpenQRAndCloudSync={() => setIsSyncModalOpen(true)}
        onOpenGoogleWorkspace={() => setIsWorkspaceModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        onOpenExportImport={() => setIsExportImportOpen(true)}
        onOpenContacts={() => setIsContactsModalOpen(true)}
        onOpenTags={() => setIsTagsModalOpen(true)}
        onNavigateToWorkspace={(ws) => setCurrentWorkspace(ws)}
        onResetLedger={handleResetLedger}
      />

      {/* Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 py-6 text-center text-xs text-stone-400 dark:text-stone-500 bg-white/50 dark:bg-stone-900/50">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>Task-OS</strong> — Sistema Operativo Personal de Pepe Cortazar
          </span>
          <span className="text-[11px]">
            Menos tareas activas • Más tareas terminadas • Enfoque protegido
          </span>
        </div>
      </footer>
    </div>
  );
}
