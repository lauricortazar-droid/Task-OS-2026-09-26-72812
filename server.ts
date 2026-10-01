import express from "express";
import type { Request, Response } from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

dotenv.config();

export interface FirebaseAdminStatus {
  initialized: boolean;
  projectId: string;
  databaseId?: string;
  source: "serviceAccountKey" | "env_json" | "env_path" | "applicationDefault" | "none";
  serviceAccountEmail?: string;
  error?: string;
}

let firebaseAdminApp: any = null;
let adminAuth: any = null;
let adminFirestore: any = null;
let adminMessaging: any = null;
let adminStatus: FirebaseAdminStatus = {
  initialized: false,
  projectId: "gen-lang-client-0098696571",
  databaseId: "ai-studio-taskos-90239d7f-e919-4b74-8cf9-4bd6da226df9",
  source: "none",
};

/**
 * Initializes Firebase Admin SDK with Service Account Key or Application Default Credentials.
 */
function initFirebaseAdmin(): FirebaseAdminStatus {
  if (getApps().length > 0 && firebaseAdminApp) {
    return adminStatus;
  }

  const defaultProjectId = "gen-lang-client-0098696571";
  const defaultDatabaseId = "ai-studio-taskos-90239d7f-e919-4b74-8cf9-4bd6da226df9";

  try {
    let serviceAccount: any = null;
    let source: FirebaseAdminStatus["source"] = "none";

    // 1. Check raw JSON in FIREBASE_SERVICE_ACCOUNT_KEY env
    const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (envKey) {
      const trimmed = envKey.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          serviceAccount = JSON.parse(trimmed);
          source = "env_json";
        } catch (e: any) {
          console.warn("[Firebase Admin] No se pudo parsear JSON de FIREBASE_SERVICE_ACCOUNT_KEY:", e.message);
        }
      } else if (fs.existsSync(trimmed)) {
        try {
          serviceAccount = JSON.parse(fs.readFileSync(trimmed, "utf8"));
          source = "env_path";
        } catch (e: any) {
          console.warn("[Firebase Admin] Error al leer archivo de FIREBASE_SERVICE_ACCOUNT_KEY:", e.message);
        }
      }
    }

    // 2. Check GOOGLE_APPLICATION_CREDENTIALS path
    if (!serviceAccount && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const gpath = process.env.GOOGLE_APPLICATION_CREDENTIALS.trim();
      if (fs.existsSync(gpath)) {
        try {
          serviceAccount = JSON.parse(fs.readFileSync(gpath, "utf8"));
          source = "env_path";
        } catch (e: any) {
          console.warn("[Firebase Admin] Error al leer GOOGLE_APPLICATION_CREDENTIALS:", e.message);
        }
      }
    }

    // 3. Check default local files in workspace
    if (!serviceAccount) {
      const candidatePaths = [
        path.join(process.cwd(), "serviceAccountKey.json"),
        path.join(process.cwd(), "config", "serviceAccountKey.json"),
        path.join(process.cwd(), "data", "serviceAccountKey.json"),
      ];

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          try {
            serviceAccount = JSON.parse(fs.readFileSync(p, "utf8"));
            source = "serviceAccountKey";
            break;
          } catch (e: any) {
            console.warn(`[Firebase Admin] Archivo encontrado en ${p} pero no se pudo parsear:`, e.message);
          }
        }
      }
    }

    // 4. Initialize with Service Account if loaded
    if (serviceAccount && serviceAccount.private_key) {
      firebaseAdminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || defaultProjectId,
      });

      adminAuth = getAuth(firebaseAdminApp);
      adminFirestore = getFirestore(firebaseAdminApp, defaultDatabaseId);
      adminMessaging = getMessaging(firebaseAdminApp);

      adminStatus = {
        initialized: true,
        projectId: serviceAccount.project_id || defaultProjectId,
        databaseId: defaultDatabaseId,
        source,
        serviceAccountEmail: serviceAccount.client_email,
      };

      console.log(`[Firebase Admin] Inicializado exitosamente con cuenta de servicio (${serviceAccount.client_email}) para proyecto ${adminStatus.projectId}`);
      return adminStatus;
    }

    // 5. Fallback: try application default credentials in GCP / Cloud Run environment
    try {
      firebaseAdminApp = initializeApp({
        credential: applicationDefault(),
        projectId: defaultProjectId,
      });

      adminAuth = getAuth(firebaseAdminApp);
      adminFirestore = getFirestore(firebaseAdminApp, defaultDatabaseId);
      adminMessaging = getMessaging(firebaseAdminApp);

      adminStatus = {
        initialized: true,
        projectId: defaultProjectId,
        databaseId: defaultDatabaseId,
        source: "applicationDefault",
      };

      console.log(`[Firebase Admin] Inicializado con credenciales predeterminadas de aplicación (ADC) para proyecto ${defaultProjectId}`);
      return adminStatus;
    } catch {
      // ADC not available in standard local dev without gcloud auth
    }

    adminStatus = {
      initialized: false,
      projectId: defaultProjectId,
      databaseId: defaultDatabaseId,
      source: "none",
      error: "No se encontró serviceAccountKey.json ni credenciales de servicio.",
    };

    console.log("[Firebase Admin] Modo informativo: No se ha provisto serviceAccountKey.json.");
    return adminStatus;
  } catch (error: any) {
    adminStatus = {
      initialized: false,
      projectId: defaultProjectId,
      databaseId: defaultDatabaseId,
      source: "none",
      error: error.message || "Error al inicializar Firebase Admin SDK",
    };
    console.error("[Firebase Admin] Error en inicialización:", error);
    return adminStatus;
  }
}

function getAdminApp(): any {
  if (!firebaseAdminApp) initFirebaseAdmin();
  return firebaseAdminApp;
}

function getAdminAuth(): any {
  if (!adminAuth) initFirebaseAdmin();
  return adminAuth;
}

function getAdminFirestore(): any {
  if (!adminFirestore) initFirebaseAdmin();
  return adminFirestore;
}

function getAdminMessaging(): any {
  if (!adminMessaging) initFirebaseAdmin();
  return adminMessaging;
}

function getFirebaseAdminStatus(): FirebaseAdminStatus {
  if (!firebaseAdminApp) initFirebaseAdmin();
  return adminStatus;
}

const app = express();
const httpServer = http.createServer(app);

// Initialize Firebase Admin on startup
initFirebaseAdmin();

const args = process.argv.slice(2);
const portIndex = args.indexOf("--port");
const portArg = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1], 10) : null;
const PORT = portArg || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

app.use(express.json({ limit: "25mb" }));

// Cloud sync persistent store directory
const DATA_DIR = path.join(process.cwd(), "data");
const SYNC_FILE = path.join(DATA_DIR, "cloud_sync.json");

interface CloudSyncRecord {
  email: string;
  tasks: TaskItem[];
  globalResources?: any[];
  urlLibrary?: any[];
  contacts?: Contact[];
  tags?: any[];
  esencialTaskId?: number | null;
  secundariasTaskIds?: number[];
  updatedAt: string;
  deviceName?: string;
}

function getSyncStore(): Record<string, CloudSyncRecord> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SYNC_FILE)) {
      fs.writeFileSync(SYNC_FILE, JSON.stringify({}), "utf8");
      return {};
    }
    const data = fs.readFileSync(SYNC_FILE, "utf8");
    return JSON.parse(data || "{}");
  } catch (err) {
    console.error("Error reading sync store:", err);
    return {};
  }
}

function saveSyncStore(store: Record<string, CloudSyncRecord>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SYNC_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving sync store:", err);
  }
}

// Initialize GoogleGenAI client lazily if key is available
let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAI;
}

export interface Contact {
  id: string;
  nombre: string;
  telefono: string;
  rol?: string;
  dominio?: string;
}

export interface TaskItem {
  id: number;
  solicitante: string;
  tarea: string;
  estado: "Pendiente" | "En Proceso" | "Completado";
  fechaIngreso: string;
  fechaCompletado?: string;
  dominio?: string;
  imagenReferencia?: string;
  contacto?: {
    nombre: string;
    telefono?: string;
  };
  etiquetas?: string[];
  notas?: string;
}

interface ProcessRequestBody {
  input: string;
  currentTasks: TaskItem[];
  currentDate?: string;
  imageBase64?: string;
  imageMimeType?: string;
  contacts?: Contact[];
  selectedTags?: string[];
  preassignedCategory?: string;
}

const SYSTEM_INSTRUCTION = `Eres Task-OS, el sistema operativo ejecutivo personal de Pepe Cortazar.
Tu función no es limitarte a guardar pendientes. Tu trabajo es:
- recibir mensajes, solicitudes, ideas, capturas de pantalla, imágenes e instrucciones;
- si se incluye una imagen de referencia (captura de WhatsApp, volante, documento, nota manuscrita o comprobante), analízala cuidadosamente: lee textos, solicitantes, teléfonos, fechas límite y tareas pendientes;
- detectar qué requiere acción y formular tareas concretas con verbo de acción al inicio;
- separar lo importante de lo accesorio;
- proteger el enfoque de Pepe;
- mantener un ledger confiable con columnas exactas: ID | Solicitante | Tarea | Estado | Fecha de Ingreso;
- estados permitidos ÚNICAMENTE: "Pendiente", "En Proceso", "Completado";
- IDs numéricos únicos y consecutivos; nunca reutilizar un ID;
- redactar respuestas breves listas para WhatsApp (máximo 2 líneas, humanas, naturales, sin formalismos);
- si se solicita enviar a múltiples personas o existen múltiples destinatarios (ej. avisar a Laura y al Líder de Zona, o lista de contactos), genera también "mensajesMultiples" con destinatario, teléfono si está disponible y texto redactado;
- si la tarea es de Pepe ("Tengo que...", "Debo..."), el solicitante es "Pepe" y "mensajeParaEnviar" debe ser null o "No aplica.";
- cuando una tarea delegada pase a Completado (ej. "Terminé el 1"), genera el mensaje de aviso de entrega para el solicitante (Ley 16);
- cuando Pepe pida enfocarse o un pomodoro ("ponme un pomodoro", "me voy a enfocar en X", "timer", "25 min"), activarPomodoro=true y asigna la tarea en foco;
- Ley 8: Identifica 1 tarea esencial y máximo 2 secundarias;
- Dominios frecuentes: FGDLL, Universidad FGDLL, FGDLL.org y tecnología, Diseño/impresión/producción, Proyectos profesionales (psicología), Pepe personal, Laura.`;

// API routes
// Cloud Sync endpoints for cross-device mobile & computer sync
app.get("/api/sync/pull", (req: Request, res: Response) => {
  try {
    const rawEmail = (req.query.email as string) || "";
    const cleanEmail = rawEmail.trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ error: "Email is required for synchronization" });
    }

    const store = getSyncStore();
    const record = store[cleanEmail];

    if (record) {
      return res.json({
        exists: true,
        data: record,
      });
    }

    return res.json({
      exists: false,
      data: null,
      message: "No cloud sync data found for this email yet.",
    });
  } catch (err: any) {
    console.error("Error pulling sync data:", err);
    return res.status(500).json({ error: err.message || "Failed to pull cloud sync data" });
  }
});

app.post("/api/sync/push", (req: Request, res: Response) => {
  try {
    const {
      email,
      tasks = [],
      globalResources = [],
      urlLibrary = [],
      contacts,
      tags,
      esencialTaskId,
      secundariasTaskIds,
      deviceName,
    } = req.body;

    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ error: "Email is required for synchronization" });
    }

    const store = getSyncStore();
    const now = new Date().toISOString();

    const record: CloudSyncRecord = {
      email: cleanEmail,
      tasks: Array.isArray(tasks) ? tasks : [],
      globalResources: Array.isArray(globalResources) ? globalResources : undefined,
      urlLibrary: Array.isArray(urlLibrary) ? urlLibrary : undefined,
      contacts: Array.isArray(contacts) ? contacts : undefined,
      tags: Array.isArray(tags) ? tags : undefined,
      esencialTaskId: typeof esencialTaskId === "number" ? esencialTaskId : null,
      secundariasTaskIds: Array.isArray(secundariasTaskIds) ? secundariasTaskIds : [],
      updatedAt: now,
      deviceName: deviceName || "Navegador Web",
    };

    store[cleanEmail] = record;
    saveSyncStore(store);

    return res.json({
      success: true,
      updatedAt: now,
      totalTasks: record.tasks.length,
      email: cleanEmail,
    });
  } catch (err: any) {
    console.error("Error pushing sync data:", err);
    return res.status(500).json({ error: err.message || "Failed to push cloud sync data" });
  }
});

// Lonas synchronization endpoints
const LONAS_SYNC_FILE = path.join(DATA_DIR, "lonas_sync.json");
function getLonasStore(): Record<string, any> {
  try {
    if (!fs.existsSync(LONAS_SYNC_FILE)) return {};
    return JSON.parse(fs.readFileSync(LONAS_SYNC_FILE, "utf8") || "{}");
  } catch {
    return {};
  }
}
function saveLonasStore(store: Record<string, any>) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(LONAS_SYNC_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (e) {
    console.error("Error saving lonas store:", e);
  }
}

app.get("/api/sync/lonas", (req: Request, res: Response) => {
  try {
    const email = ((req.query.email as string) || "laurcortazar@gmail.com").trim().toLowerCase();
    const store = getLonasStore();
    return res.json({ success: true, data: store[email] || null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/sync/lonas", (req: Request, res: Response) => {
  try {
    const { email, orders } = req.body;
    const cleanEmail = (email || "laurcortazar@gmail.com").trim().toLowerCase();
    const store = getLonasStore();
    store[cleanEmail] = {
      orders: orders || [],
      updatedAt: new Date().toISOString(),
    };
    saveLonasStore(store);
    return res.json({ success: true, updatedAt: store[cleanEmail].updatedAt });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Salud Financiera synchronization endpoints
const FINANZAS_SYNC_FILE = path.join(DATA_DIR, "finanzas_sync.json");
function getFinanzasStore(): Record<string, any> {
  try {
    if (!fs.existsSync(FINANZAS_SYNC_FILE)) return {};
    return JSON.parse(fs.readFileSync(FINANZAS_SYNC_FILE, "utf8") || "{}");
  } catch {
    return {};
  }
}
function saveFinanzasStore(store: Record<string, any>) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FINANZAS_SYNC_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (e) {
    console.error("Error saving finanzas store:", e);
  }
}

app.get("/api/sync/finanzas", (req: Request, res: Response) => {
  try {
    const email = ((req.query.email as string) || "laurcortazar@gmail.com").trim().toLowerCase();
    const store = getFinanzasStore();
    return res.json({ success: true, data: store[email] || null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/sync/finanzas", (req: Request, res: Response) => {
  try {
    const { email, accounts, incomes, debts, commitments, allocations } = req.body;
    const cleanEmail = (email || "laurcortazar@gmail.com").trim().toLowerCase();
    const store = getFinanzasStore();
    store[cleanEmail] = {
      accounts: accounts || [],
      incomes: incomes || [],
      debts: debts || [],
      commitments: commitments || [],
      allocations: allocations || [],
      updatedAt: new Date().toISOString(),
    };
    saveFinanzasStore(store);
    return res.json({ success: true, updatedAt: store[cleanEmail].updatedAt });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Cross-Ecosystem Full Synchronization endpoint
app.post("/api/sync/ecosystem", (req: Request, res: Response) => {
  try {
    const { email, tasks, lonasOrders, finanzasData } = req.body;
    const cleanEmail = (email || "laurcortazar@gmail.com").trim().toLowerCase();

    // 1. Save tasks if provided
    if (tasks) {
      const syncStore = getSyncStore();
      syncStore[cleanEmail] = {
        email: cleanEmail,
        tasks,
        updatedAt: new Date().toISOString(),
      };
      saveSyncStore(syncStore);
    }

    // 2. Save lonas if provided
    if (lonasOrders) {
      const lonasStore = getLonasStore();
      lonasStore[cleanEmail] = {
        orders: lonasOrders,
        updatedAt: new Date().toISOString(),
      };
      saveLonasStore(lonasStore);
    }

    // 3. Save finanzas if provided
    if (finanzasData) {
      const finStore = getFinanzasStore();
      finStore[cleanEmail] = {
        ...finanzasData,
        updatedAt: new Date().toISOString(),
      };
      saveFinanzasStore(finStore);
    }

    return res.json({
      success: true,
      message: "Ecosistema sincronizado exitosamente",
      email: cleanEmail,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// FCM Push Notifications & Device Token API
// ==========================================
const FCM_TOKENS_FILE = path.join(DATA_DIR, "fcm_tokens.json");
const NOTIFICATIONS_HISTORY_FILE = path.join(DATA_DIR, "notifications_history.json");
const SOLICITUDES_FILE = path.join(DATA_DIR, "solicitudes.json");

interface ServerSolicitudItem {
  id: string;
  solicitante: string;
  telefono?: string;
  email?: string;
  titulo: string;
  descripcion: string;
  canal: "WhatsApp" | "ExecutiveInput" | "Web" | "Email" | "Sistema";
  prioridad: "Alta" | "Media" | "Baja";
  estado: "Nueva" | "Atendida" | "ConvertidaEnTarea" | "Descartada";
  fechaIngreso: string;
  leida: boolean;
  tareaIdAsociada?: number;
}

const INITIAL_SOLICITUDES: ServerSolicitudItem[] = [
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

function getSolicitudesStore(): Record<string, ServerSolicitudItem[]> {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(SOLICITUDES_FILE)) {
      const initial: Record<string, ServerSolicitudItem[]> = {
        default: INITIAL_SOLICITUDES,
      };
      fs.writeFileSync(SOLICITUDES_FILE, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    const data = fs.readFileSync(SOLICITUDES_FILE, "utf8");
    return JSON.parse(data || "{}");
  } catch (_) {
    return { default: INITIAL_SOLICITUDES };
  }
}

function saveSolicitudesStore(store: Record<string, ServerSolicitudItem[]>) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SOLICITUDES_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (_) {}
}

interface FCMTokenRecord {
  token: string;
  email: string;
  device?: string;
  userAgent?: string;
  updatedAt: string;
}

interface NotificationHistoryRecord {
  id: string;
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  email?: string;
  token?: string;
  type: string;
  data?: any;
  timestamp: string;
  delivered: boolean;
}

function getFCMTokens(): Record<string, FCMTokenRecord[]> {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(FCM_TOKENS_FILE)) {
      fs.writeFileSync(FCM_TOKENS_FILE, JSON.stringify({}), "utf8");
      return {};
    }
    const data = fs.readFileSync(FCM_TOKENS_FILE, "utf8");
    return JSON.parse(data || "{}");
  } catch (_) {
    return {};
  }
}

function saveFCMTokens(tokens: Record<string, FCMTokenRecord[]>) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FCM_TOKENS_FILE, JSON.stringify(tokens, null, 2), "utf8");
  } catch (_) {}
}

function getNotificationsHistory(): NotificationHistoryRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(NOTIFICATIONS_HISTORY_FILE)) {
      fs.writeFileSync(NOTIFICATIONS_HISTORY_FILE, JSON.stringify([]), "utf8");
      return [];
    }
    const data = fs.readFileSync(NOTIFICATIONS_HISTORY_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch (_) {
    return [];
  }
}

function saveNotificationsHistory(history: NotificationHistoryRecord[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(NOTIFICATIONS_HISTORY_FILE, JSON.stringify(history.slice(0, 100), null, 2), "utf8");
  } catch (_) {}
}

// 1. Register device FCM token
app.post("/api/notifications/register-token", (req: Request, res: Response) => {
  try {
    const { token, email = "laurcortazar@gmail.com", device, userAgent } = req.body;
    if (!token) return res.status(400).json({ error: "Token is required" });

    const cleanEmail = email.trim().toLowerCase();
    const store = getFCMTokens();
    const userTokens = store[cleanEmail] || [];

    const existingIdx = userTokens.findIndex((t) => t.token === token);
    const now = new Date().toISOString();
    if (existingIdx >= 0) {
      userTokens[existingIdx].updatedAt = now;
      if (device) userTokens[existingIdx].device = device;
    } else {
      userTokens.push({
        token,
        email: cleanEmail,
        device: device || (/Mobi|Android/i.test(userAgent || "") ? "mobile" : "desktop"),
        userAgent,
        updatedAt: now,
      });
    }

    store[cleanEmail] = userTokens;
    saveFCMTokens(store);

    return res.json({ success: true, count: userTokens.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 1.5 Firebase Admin SDK Status endpoint
app.get("/api/firebase/admin-status", (_req: Request, res: Response) => {
  const status = getFirebaseAdminStatus();
  return res.json({
    ...status,
    help: status.initialized
      ? "Firebase Admin SDK activo con credenciales de servicio."
      : "Para activar Firebase Admin en el servidor, descarga la clave privada desde Firebase Console > Configuración del proyecto > Cuentas de servicio > Generar nueva clave privada, y colócala como serviceAccountKey.json en la raíz o en la variable FIREBASE_SERVICE_ACCOUNT_KEY.",
  });
});

// 2. Send push notification event
app.post("/api/notifications/send", (req: Request, res: Response) => {
  try {
    const { title, body, icon, tag, url, data = {}, token, email = "laurcortazar@gmail.com" } = req.body;
    if (!title || !body) return res.status(400).json({ error: "Title and body are required" });

    const notifRecord: NotificationHistoryRecord = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      body,
      icon: icon || "/icon-192.svg",
      tag: tag || "task-os-push",
      url: url || "/",
      email: email.trim().toLowerCase(),
      token,
      type: tag?.includes("task") ? "task_completed" : tag?.includes("client") ? "client_message" : "general",
      data,
      timestamp: new Date().toISOString(),
      delivered: true,
    };

    const history = getNotificationsHistory();
    history.unshift(notifRecord);
    saveNotificationsHistory(history);

    console.log(`[Push Notification Registrada/Enviada] ${title} -> ${body}`);

    // If Firebase Admin Messaging is initialized, deliver via FCM
    try {
      const messaging = getAdminMessaging();
      if (messaging) {
        const tokensStore = getFCMTokens();
        const userEmailClean = email.trim().toLowerCase();
        const targetTokens = token
          ? [token]
          : tokensStore[userEmailClean]?.map((t) => t.token) || [];

        if (targetTokens.length > 0) {
          messaging
            .sendEachForMulticast({
              tokens: targetTokens,
              notification: {
                title,
                body,
              },
              data: {
                url: url || "/",
                tag: tag || "task-os-push",
              },
            })
            .then((resp: any) => {
              console.log(`[FCM Admin] Despachado a ${resp.successCount} dispositivos (${resp.failureCount} fallos)`);
            })
            .catch((e: any) => {
              console.warn("[FCM Admin] Aviso al despachar multicast:", e.message);
            });
        }
      }
    } catch (e: any) {
      console.warn("[FCM Admin] Error de entrega FCM:", e.message);
    }

    return res.json({
      success: true,
      notification: notifRecord,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Get notification history
app.get("/api/notifications/history", (req: Request, res: Response) => {
  try {
    const email = req.query.email ? String(req.query.email).trim().toLowerCase() : null;
    const history = getNotificationsHistory();
    const filtered = email ? history.filter((h) => !h.email || h.email === email) : history;
    return res.json({ success: true, notifications: filtered.slice(0, 30) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Get active registered device tokens status
app.get("/api/notifications/status", (req: Request, res: Response) => {
  try {
    const email = (req.query.email ? String(req.query.email) : "laurcortazar@gmail.com").trim().toLowerCase();
    const store = getFCMTokens();
    const userTokens = store[email] || [];
    return res.json({
      success: true,
      registeredDevices: userTokens.length,
      devices: userTokens.map((t) => ({ device: t.device, updatedAt: t.updatedAt })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SOLICITUDES & NOTIFICATION CENTER API
// ==========================================

// 1. Get all solicitudes
app.get("/api/solicitudes", (req: Request, res: Response) => {
  try {
    const email = (req.query.email ? String(req.query.email) : "default").trim().toLowerCase();
    const store = getSolicitudesStore();
    const list = store[email] || store["default"] || [];
    return res.json({ success: true, solicitudes: list });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Create new solicitud + trigger push & email notification
app.post("/api/solicitudes/crear", (req: Request, res: Response) => {
  try {
    const {
      solicitante = "Nuevo Contacto",
      telefono,
      email: contactEmail,
      titulo,
      descripcion = "",
      canal = "WhatsApp",
      prioridad = "Alta",
      targetUserEmail = "laurcortazar@gmail.com",
    } = req.body;

    if (!titulo && !descripcion) {
      return res.status(400).json({ error: "Título o descripción es requerido" });
    }

    const cleanUserEmail = (targetUserEmail || "laurcortazar@gmail.com").trim().toLowerCase();
    const store = getSolicitudesStore();
    const userSolicitudes = store[cleanUserEmail] || store["default"] || [...INITIAL_SOLICITUDES];

    const newSolicitud: ServerSolicitudItem = {
      id: `sol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      solicitante: solicitante.trim(),
      telefono: telefono ? telefono.trim() : undefined,
      email: contactEmail ? contactEmail.trim() : undefined,
      titulo: (titulo || descripcion.slice(0, 60)).trim(),
      descripcion: descripcion.trim(),
      canal,
      prioridad,
      estado: "Nueva",
      fechaIngreso: new Date().toISOString(),
      leida: false,
    };

    userSolicitudes.unshift(newSolicitud);
    store[cleanUserEmail] = userSolicitudes;
    saveSolicitudesStore(store);

    // 1. Register Push Notification in notification history
    const notifRecord: NotificationHistoryRecord = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `🚨 Nueva Solicitud: ${newSolicitud.solicitante}`,
      body: `${newSolicitud.titulo} — ${newSolicitud.descripcion.slice(0, 100)}`,
      icon: "/icon-192.svg",
      tag: "solicitud_nueva",
      url: "/",
      email: cleanUserEmail,
      type: "solicitud_nueva",
      data: { solicitudId: newSolicitud.id, solicitante: newSolicitud.solicitante, telefono: newSolicitud.telefono },
      timestamp: new Date().toISOString(),
      delivered: true,
    };

    const notifHistory = getNotificationsHistory();
    notifHistory.unshift(notifRecord);
    saveNotificationsHistory(notifHistory);

    // 2. Prepare Rich Email Notification
    const dateFormatted = new Date().toLocaleString("es-ES", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const emailSubject = `[Task-OS] 🚨 Nueva Solicitud de ${newSolicitud.solicitante}: ${newSolicitud.titulo}`;
    const emailBodyText = `Hola Pepe,\n\nHas recibido una nueva solicitud en Task-OS:\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 Solicitante: ${newSolicitud.solicitante}\n` +
      (newSolicitud.telefono ? `📞 Teléfono: ${newSolicitud.telefono}\n` : "") +
      `📌 Asunto: ${newSolicitud.titulo}\n` +
      `⚡ Prioridad: ${newSolicitud.prioridad}\n` +
      `📡 Canal de Ingreso: ${newSolicitud.canal}\n` +
      `🕒 Fecha: ${dateFormatted}\n\n` +
      `📝 Detalle de la Solicitud:\n${newSolicitud.descripcion}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Abre Task-OS para atenderla o convertirla en tarea del Ledger.\n`;

    console.log(`[Solicitud Creada & Notificación Despachada] ${newSolicitud.solicitante} -> ${newSolicitud.titulo}`);

    return res.json({
      success: true,
      solicitud: newSolicitud,
      pushDelivered: true,
      emailPrepared: {
        to: cleanUserEmail,
        subject: emailSubject,
        bodyText: emailBodyText,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Update solicitud (mark as read, change status, link task)
app.put("/api/solicitudes/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado, leida, tareaIdAsociada, targetUserEmail } = req.body;
    const email = (targetUserEmail || "laurcortazar@gmail.com").trim().toLowerCase();
    const store = getSolicitudesStore();
    const list = store[email] || store["default"] || [];

    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    if (estado !== undefined) list[idx].estado = estado;
    if (leida !== undefined) list[idx].leida = leida;
    if (tareaIdAsociada !== undefined) list[idx].tareaIdAsociada = tareaIdAsociada;

    store[email] = list;
    saveSolicitudesStore(store);

    return res.json({ success: true, solicitud: list[idx] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Send email notification for a solicitud
app.post("/api/notifications/send-solicitud-email", (req: Request, res: Response) => {
  try {
    const { solicitudId, toEmail = "laurcortazar@gmail.com", customNotes } = req.body;
    const store = getSolicitudesStore();
    const all = Object.values(store).flat();
    const solicitud = all.find((s) => s.id === solicitudId);

    const cleanTo = (toEmail || "laurcortazar@gmail.com").trim();
    const solicitante = solicitud?.solicitante || "Solicitante";
    const titulo = solicitud?.titulo || "Solicitud de Tarea";
    const descripcion = solicitud?.descripcion || "";

    const dateFormatted = new Date().toLocaleString("es-ES", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const subject = `[Task-OS Alerta] Nueva Solicitud: ${solicitante} — ${titulo}`;
    let bodyText = `Hola,\n\nSe ha recibido y registrado una nueva solicitud en Task-OS:\n\n` +
      `• Solicitante: ${solicitante}\n` +
      (solicitud?.telefono ? `• Teléfono WhatsApp: ${solicitud.telefono}\n` : "") +
      `• Título: ${titulo}\n` +
      `• Prioridad: ${solicitud?.prioridad || "Alta"}\n` +
      `• Canal: ${solicitud?.canal || "WhatsApp"}\n` +
      `• Fecha: ${dateFormatted}\n\n` +
      `Descripción:\n${descripcion}\n\n`;

    if (customNotes) {
      bodyText += `Notas ejecutivas adicionales:\n${customNotes}\n\n`;
    }

    bodyText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Notificación automática de Task-OS • Sistema Operativo Personal`;

    const mailtoUrl = `mailto:${encodeURIComponent(cleanTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

    return res.json({
      success: true,
      email: cleanTo,
      subject,
      bodyText,
      mailtoUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/sync/email-summary", (req: Request, res: Response) => {
  try {
    const { email, tasks = [], esencialTaskId, secundariasTaskIds = [] } = req.body;
    const cleanEmail = (email || "").trim();
    const dateStr = new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const activeTasks = tasks.filter((t: any) => t.estado !== "Completado");
    const completedTasks = tasks.filter((t: any) => t.estado === "Completado");
    const esencial = tasks.find((t: any) => t.id === esencialTaskId);
    const secundarias = tasks.filter((t: any) => secundariasTaskIds.includes(t.id));

    let body = `Hola,\n\nEste es tu resumen ejecutivo de Task-OS sincronizado con tu correo (${cleanEmail}) para ${dateStr}.\n\n`;
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `⭐ TAREA ESENCIAL DE HOY (Ley del Foco):\n`;
    if (esencial) {
      body += `[ID #${esencial.id}] [${esencial.dominio || "General"}] ${esencial.tarea} (Solicitante: ${esencial.solicitante})\n`;
    } else {
      body += `(No hay tarea esencial definida)\n`;
    }

    body += `\n🎯 TAREAS SECUNDARIAS:\n`;
    if (secundarias.length > 0) {
      secundarias.forEach((t: any) => {
        body += `• [ID #${t.id}] ${t.tarea} (${t.solicitante})\n`;
      });
    } else {
      body += `(Ninguna)\n`;
    }

    body += `\n📋 TAREAS ABIERTAS TOTALES (${activeTasks.length}):\n`;
    activeTasks.forEach((t: any) => {
      body += `• [#${t.id}] [${t.estado}] [${t.dominio || "General"}] ${t.tarea} — ${t.solicitante}${t.contacto?.telefono ? ` (Tel: ${t.contacto.telefono})` : ""}\n`;
      if (t.notas) {
        body += `   Observaciones: ${t.notas}\n`;
      }
    });

    if (completedTasks.length > 0) {
      body += `\n✅ COMPLETADAS RECIENTES (${completedTasks.length}):\n`;
      completedTasks.slice(0, 5).forEach((t: any) => {
        body += `✓ [#${t.id}] ${t.tarea} (${t.solicitante})\n`;
      });
    }

    body += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `Sincronizado vía Task-OS Cloud • Celular y Computadora al día.`;

    const subject = `[Task-OS] Resumen Ejecutivo del Ledger — ${dateStr}`;

    return res.json({
      success: true,
      subject,
      bodyText: body,
      email: cleanEmail,
    });
  } catch (err: any) {
    console.error("Error generating email summary:", err);
    return res.status(500).json({ error: err.message || "Failed to generate summary" });
  }
});

// ==========================================
// MODEL CONTEXT PROTOCOL (MCP) SERVER
// Permite conectar Google Gemini y asistentes IA
// directamente con el sistema ejecutivo Task-OS
// ==========================================

const mcpSessions = new Map<string, Response>();

// MCP Tool Catalog for Gemini
const MCP_TOOLS = [
  {
    name: "get_tasks",
    description: "Obtiene la lista de tareas del Ledger de Task-OS de Pepe Cortazar. Permite consultar tareas pendientes, en proceso o completadas, o filtrar por dominio (Laura, FGDLL, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        estado: { type: "string", enum: ["Todos", "Pendiente", "En Proceso", "Completado"], description: "Filtrar por estado de la tarea" },
        dominio: { type: "string", description: "Filtrar por dominio o área (ej. Laura, FGDLL, Finanzas, Lonas)" },
        soloActivas: { type: "boolean", description: "Si es true, sólo retorna tareas no completadas" },
      },
    },
  },
  {
    name: "create_task",
    description: "Crea y registra una nueva tarea ejecutiva en el Ledger de Task-OS con solicitante, notas, dominio y prioridad.",
    inputSchema: {
      type: "object",
      properties: {
        tarea: { type: "string", description: "Descripción clara y accionable de la tarea" },
        solicitante: { type: "string", description: "Nombre de la persona o entidad solicitante (ej. Laura, FGDLL, Personal)" },
        notas: { type: "string", description: "Observaciones, contexto o especificaciones técnicas" },
        dominio: { type: "string", description: "Dominio o área (ej. Laura, FGDLL, Finanzas, Lonas)" },
        esencial: { type: "boolean", description: "Si es true, se marca como la prioridad principal #1 (Ley 8)" },
      },
      required: ["tarea"],
    },
  },
  {
    name: "complete_task",
    description: "Marca una tarea existente como completada en el Ledger de Task-OS (cumpliendo la Ley 15 de cierre de ciclos).",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "number", description: "ID numérico de la tarea a completar" },
        observacion: { type: "string", description: "Nota opcional de cierre o confirmación" },
      },
      required: ["taskId"],
    },
  },
  {
    name: "get_essential_task",
    description: "Consulta la Tarea Esencial activa (#1 de máxima prioridad según la Ley 8 del Sistema Ejecutivo de Pepe Cortazar).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_financial_summary",
    description: "Consulta el resumen de Salud Financiera: ingresos acumulados, egresos, saldo neto y cuentas por cobrar.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_lonas_orders",
    description: "Consulta los pedidos de lonas y diseño en gran formato registrados en Lonas-OS.",
    inputSchema: {
      type: "object",
      properties: {
        estado: { type: "string", description: "Filtrar por estado del pedido (Pendiente, En Impresión, Entregado)" },
      },
    },
  },
  {
    name: "search_task_os",
    description: "Búsqueda universal en Task-OS por palabra clave en tareas, subnotas, contactos y pedidos.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Término o palabra a buscar" },
      },
      required: ["query"],
    },
  },
  {
    name: "create_solicitud",
    description: "Crea una solicitud entrante en el buzón de solicitudes de Task-OS con remitente, asunto y mensaje.",
    inputSchema: {
      type: "object",
      properties: {
        remitente: { type: "string", description: "Nombre de quien envía la solicitud" },
        asunto: { type: "string", description: "Asunto o título de la solicitud" },
        mensaje: { type: "string", description: "Contenido del mensaje" },
        telefono: { type: "string", description: "Teléfono de contacto opcional" },
      },
      required: ["remitente", "asunto", "mensaje"],
    },
  },
];

// Helper to execute MCP tool calls
async function handleMcpToolCall(name: string, args: any = {}) {
  const syncStore = getSyncStore();
  const defaultUserKey = "laurcortazar@gmail.com";
  const userRecord = syncStore[defaultUserKey] || Object.values(syncStore)[0] || {
    email: defaultUserKey,
    tasks: [],
    updatedAt: new Date().toISOString(),
  };

  switch (name) {
    case "get_tasks": {
      let tasks = userRecord.tasks || [];
      if (args.soloActivas) {
        tasks = tasks.filter((t: any) => t.estado !== "Completado");
      }
      if (args.estado && args.estado !== "Todos") {
        tasks = tasks.filter((t: any) => t.estado === args.estado);
      }
      if (args.dominio) {
        const dom = args.dominio.toLowerCase();
        tasks = tasks.filter((t: any) =>
          (t.dominio && t.dominio.toLowerCase().includes(dom)) ||
          (t.solicitante && t.solicitante.toLowerCase().includes(dom))
        );
      }

      const formatted = tasks.map((t: any) => ({
        id: t.id,
        tarea: t.tarea,
        solicitante: t.solicitante,
        estado: t.estado,
        dominio: t.dominio || "General",
        esencial: userRecord.esencialTaskId === t.id,
        notas: t.notas || "",
        fechaIngreso: t.fechaIngreso,
      }));

      return {
        total: formatted.length,
        esencialTaskId: userRecord.esencialTaskId,
        tasks: formatted,
      };
    }

    case "create_task": {
      const tasks = userRecord.tasks || [];
      const nextId = tasks.reduce((max: number, t: any) => Math.max(max, t.id || 0), 0) + 1;
      const now = new Date().toISOString();

      const newTask: TaskItem = {
        id: nextId,
        solicitante: (args.solicitante || "Gemini MCP").trim(),
        tarea: args.tarea.trim(),
        estado: "Pendiente",
        fechaIngreso: now,
        dominio: args.dominio ? args.dominio.trim() : "General",
        notas: args.notas ? args.notas.trim() : undefined,
      };

      tasks.unshift(newTask);
      userRecord.tasks = tasks;
      userRecord.updatedAt = now;

      if (args.esencial) {
        userRecord.esencialTaskId = nextId;
      }

      syncStore[defaultUserKey] = userRecord;
      saveSyncStore(syncStore);

      return {
        success: true,
        message: `Tarea #${nextId} creada exitosamente en Task-OS: "${newTask.tarea}" para ${newTask.solicitante}`,
        task: newTask,
      };
    }

    case "complete_task": {
      const tasks = userRecord.tasks || [];
      const taskId = Number(args.taskId);
      const target = tasks.find((t: any) => t.id === taskId);

      if (!target) {
        throw new Error(`No se encontró ninguna tarea con el ID #${taskId}`);
      }

      target.estado = "Completado";
      target.fechaCompletado = new Date().toISOString();
      if (args.observacion) {
        target.notas = target.notas ? `${target.notas}\n\n[Cierre MCP]: ${args.observacion}` : `[Cierre MCP]: ${args.observacion}`;
      }

      userRecord.tasks = tasks;
      userRecord.updatedAt = new Date().toISOString();
      syncStore[defaultUserKey] = userRecord;
      saveSyncStore(syncStore);

      return {
        success: true,
        message: `Tarea #${taskId} ("${target.tarea}") marcada como COMPLETADA exitosamente en Task-OS (Ley 15).`,
        task: target,
      };
    }

    case "get_essential_task": {
      const tasks = userRecord.tasks || [];
      const esencialId = userRecord.esencialTaskId;
      const task = tasks.find((t: any) => t.id === esencialId) || tasks.find((t: any) => t.estado !== "Completado");

      if (!task) {
        return {
          hasEssential: false,
          message: "No hay ninguna tarea esencial activa en este momento en Task-OS.",
        };
      }

      return {
        hasEssential: true,
        isExplicitlyMarked: userRecord.esencialTaskId === task.id,
        task: {
          id: task.id,
          tarea: task.tarea,
          solicitante: task.solicitante,
          estado: task.estado,
          dominio: task.dominio,
          notas: task.notas || "",
        },
      };
    }

    case "get_financial_summary": {
      const finanzasStore = getFinanzasStore();
      const records = finanzasStore[defaultUserKey] || finanzasStore["default"] || [];
      let totalIngresos = 0;
      let totalEgresos = 0;

      records.forEach((r: any) => {
        const monto = Number(r.monto || 0);
        if (r.tipo === "Ingreso") totalIngresos += monto;
        else if (r.tipo === "Egreso") totalEgresos += monto;
      });

      return {
        totalIngresos,
        totalEgresos,
        saldoNeto: totalIngresos - totalEgresos,
        totalMovimientos: records.length,
        ultimosMovimientos: records.slice(0, 5),
      };
    }

    case "list_lonas_orders": {
      const lonasStore = getLonasStore();
      const orders = lonasStore[defaultUserKey] || lonasStore["default"] || [];
      let filtered = orders;
      if (args.estado) {
        filtered = orders.filter((o: any) => o.estado === args.estado);
      }
      return {
        total: filtered.length,
        pedidos: filtered.slice(0, 15).map((o: any) => ({
          id: o.id,
          folio: o.folio,
          cliente: o.cliente,
          medidas: `${o.ancho || 0}m × ${o.alto || 0}m`,
          material: o.material,
          total: o.total,
          anticipo: o.anticipo,
          saldo: (o.total || 0) - (o.anticipo || 0),
          estado: o.estado,
          fechaEntrega: o.fechaEntrega,
        })),
      };
    }

    case "search_task_os": {
      const q = (args.query || "").toLowerCase();
      const tasks = (userRecord.tasks || []).filter((t: any) =>
        (t.tarea && t.tarea.toLowerCase().includes(q)) ||
        (t.solicitante && t.solicitante.toLowerCase().includes(q)) ||
        (t.notas && t.notas.toLowerCase().includes(q))
      );
      const contacts = (userRecord.contacts || []).filter((c: any) =>
        (c.nombre && c.nombre.toLowerCase().includes(q)) ||
        (c.telefono && c.telefono.includes(q)) ||
        (c.rol && c.rol.toLowerCase().includes(q))
      );

      return {
        query: args.query,
        tasksCount: tasks.length,
        contactsCount: contacts.length,
        tasks: tasks.slice(0, 10),
        contacts: contacts.slice(0, 5),
      };
    }

    case "create_solicitud": {
      const store = getSolicitudesStore();
      const userSolicitudes = store[defaultUserKey] || store["default"] || [];
      const newSol = {
        id: `sol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        solicitante: args.remitente.trim(),
        telefono: args.telefono ? args.telefono.trim() : undefined,
        titulo: `[Gemini MCP] ${args.asunto.trim()}`,
        descripcion: args.mensaje.trim(),
        canal: "Web" as const,
        prioridad: "Alta" as const,
        estado: "Nueva" as const,
        fechaIngreso: new Date().toISOString(),
        leida: false,
      };

      userSolicitudes.unshift(newSol);
      store[defaultUserKey] = userSolicitudes;
      saveSolicitudesStore(store);

      return {
        success: true,
        message: `Solicitud creada en el buzón de Task-OS con ID ${newSol.id}`,
        solicitud: newSol,
      };
    }

    default:
      throw new Error(`Herramienta MCP desconocida: "${name}"`);
  }
}

// CORS Helper for MCP
function setMcpCorsHeaders(res: Response) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
}

app.options("/mcp", (_req: Request, res: Response) => {
  setMcpCorsHeaders(res);
  res.status(204).end();
});

app.options("/mcp/sse", (_req: Request, res: Response) => {
  setMcpCorsHeaders(res);
  res.status(204).end();
});

app.options("/mcp/message", (_req: Request, res: Response) => {
  setMcpCorsHeaders(res);
  res.status(204).end();
});

// GET /mcp and GET /mcp/sse (SSE endpoint + web status page)
app.get(["/mcp", "/mcp/sse"], (req: Request, res: Response) => {
  setMcpCorsHeaders(res);

  // If client requests SSE stream (standard MCP transport)
  if (req.headers.accept?.includes("text/event-stream") || req.path.endsWith("/sse") || req.query.transport === "sse") {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const sessionId = `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    mcpSessions.set(sessionId, res);

    // Send standard MCP endpoint event
    res.write(`event: endpoint\ndata: /mcp/message?sessionId=${sessionId}\n\n`);

    const heartbeat = setInterval(() => {
      try {
        res.write(": keep-alive\n\n");
      } catch (_) {
        clearInterval(heartbeat);
      }
    }, 15000);

    req.on("close", () => {
      clearInterval(heartbeat);
      mcpSessions.delete(sessionId);
    });
    return;
  }

  // Friendly web browser page
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "ais-pre-dwgikgfu64evytiqb4nzms-347865637985.us-east1.run.app";
  const mcpUrl = `${proto}://${host}/mcp`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task-OS • Servidor Model Context Protocol (MCP)</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0c0a09; color: #f5f5f4; margin: 0; padding: 24px; line-height: 1.5; }
    .card { max-width: 640px; margin: 30px auto; background: #1c1917; border: 1px solid #292524; border-radius: 20px; padding: 28px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; background: rgba(16, 185, 129, 0.15); color: #34d399; font-size: 12px; font-weight: 700; }
    .url-box { background: #0c0a09; border: 1px solid #44403c; border-radius: 12px; padding: 12px 14px; font-family: monospace; font-size: 13px; color: #f59e0b; word-break: break-all; margin: 16px 0; }
    ol { padding-left: 20px; font-size: 13px; color: #d6d3d1; }
    li { margin-bottom: 8px; }
    .tool-list { list-style: none; padding: 0; display: grid; gap: 8px; margin-top: 14px; }
    .tool-item { background: #292524; padding: 10px 14px; border-radius: 10px; font-size: 12px; border-left: 3px solid #f59e0b; }
    .tool-name { font-weight: bold; color: #fafaf9; font-family: monospace; }
  </style>
</head>
<body>
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h2 style="margin: 0; font-size: 20px;">🤖 Task-OS MCP Server</h2>
      <span class="badge">● Online & Activo</span>
    </div>
    <p style="font-size: 13px; color: #a8a29e; margin-top: 8px;">
      Servidor oficial de <strong>Model Context Protocol (MCP)</strong> de Task-OS para conectar Google Gemini, Claude y asistentes IA a tu Ledger ejecutivo.
    </p>

    <div style="margin-top: 20px;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #a8a29e;">URL para conectar en Gemini:</div>
      <div class="url-box">${mcpUrl}</div>
    </div>

    <div style="margin-top: 20px;">
      <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #f5f5f4;">¿Cómo conectarlo en Google Gemini?</h4>
      <ol>
        <li>En la ventana <strong>"Conéctate a un servidor de MCP"</strong> de Gemini:</li>
        <li>Pega en <strong>URL del servidor de MCP</strong>: <code>${mcpUrl}</code></li>
        <li>En <strong>Configuración adicional</strong> (ID / Secreto): déjalo <strong>vacío</strong> (no se requiere).</li>
        <li>Haz clic en <strong>Siguiente</strong> y Gemini cargará todas las herramientas de tu Task-OS.</li>
      </ol>
    </div>

    <div style="margin-top: 24px;">
      <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #f5f5f4;">Herramientas disponibles (8 Tools):</h4>
      <div class="tool-list">
        <div class="tool-item"><span class="tool-name">get_tasks</span> — Consulta tareas pendientes, en proceso y completadas.</div>
        <div class="tool-item"><span class="tool-name">create_task</span> — Registra una nueva tarea en tu Ledger con prioridad y notas.</div>
        <div class="tool-item"><span class="tool-name">complete_task</span> — Marca una tarea como finalizada (Ley 15).</div>
        <div class="tool-item"><span class="tool-name">get_essential_task</span> — Consulta la tarea #1 de máxima prioridad (Ley 8).</div>
        <div class="tool-item"><span class="tool-name">get_financial_summary</span> — Consulta ingresos, egresos y saldo en Finanzas.</div>
        <div class="tool-item"><span class="tool-name">list_lonas_orders</span> — Lista pedidos de lonas y diseño en gran formato.</div>
        <div class="tool-item"><span class="tool-name">search_task_os</span> — Búsqueda universal por palabra clave.</div>
        <div class="tool-item"><span class="tool-name">create_solicitud</span> — Envía una solicitud al buzón de entrada.</div>
      </div>
    </div>
  </div>
</body>
</html>
  `);
});

// JSON-RPC 2.0 Handler for POST /mcp and POST /mcp/message
async function handleMcpJsonRpc(req: Request, res: Response) {
  setMcpCorsHeaders(res);
  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error: Invalid JSON payload" },
    });
  }

  const { jsonrpc = "2.0", id, method, params = {} } = body;

  try {
    switch (method) {
      case "initialize": {
        const result = {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: { listChanged: true },
            resources: {},
            prompts: {},
          },
          serverInfo: {
            name: "task-os-mcp-server",
            version: "1.0.0",
          },
        };
        const responsePayload = { jsonrpc: "2.0", id, result };

        // If active SSE session, also notify
        const sessionId = req.query.sessionId as string;
        if (sessionId && mcpSessions.has(sessionId)) {
          mcpSessions.get(sessionId)!.write(`event: message\ndata: ${JSON.stringify(responsePayload)}\n\n`);
        }

        return res.json(responsePayload);
      }

      case "notifications/initialized":
      case "initialized": {
        return res.status(200).json({ jsonrpc: "2.0", id: id ?? null, result: {} });
      }

      case "ping": {
        return res.json({ jsonrpc: "2.0", id, result: {} });
      }

      case "tools/list": {
        const responsePayload = {
          jsonrpc: "2.0",
          id,
          result: {
            tools: MCP_TOOLS,
          },
        };

        const sessionId = req.query.sessionId as string;
        if (sessionId && mcpSessions.has(sessionId)) {
          mcpSessions.get(sessionId)!.write(`event: message\ndata: ${JSON.stringify(responsePayload)}\n\n`);
        }

        return res.json(responsePayload);
      }

      case "tools/call": {
        const toolName = params.name;
        const toolArgs = params.arguments || {};

        try {
          const toolResult = await handleMcpToolCall(toolName, toolArgs);
          const responsePayload = {
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult, null, 2),
                },
              ],
              isError: false,
            },
          };

          const sessionId = req.query.sessionId as string;
          if (sessionId && mcpSessions.has(sessionId)) {
            mcpSessions.get(sessionId)!.write(`event: message\ndata: ${JSON.stringify(responsePayload)}\n\n`);
          }

          return res.json(responsePayload);
        } catch (toolErr: any) {
          const errorPayload = {
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: `Error al ejecutar ${toolName}: ${toolErr.message}`,
                },
              ],
              isError: true,
            },
          };
          return res.json(errorPayload);
        }
      }

      default: {
        return res.status(200).json({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Método MCP no encontrado: "${method}"`,
          },
        });
      }
    }
  } catch (error: any) {
    console.error("[MCP Server Error]", error);
    return res.status(500).json({
      jsonrpc: "2.0",
      id: id ?? null,
      error: {
        code: -32603,
        message: error.message || "Internal MCP Server error",
      },
    });
  }
}

app.post("/mcp", handleMcpJsonRpc);
app.post("/mcp/message", handleMcpJsonRpc);

// Executive Router: URL Metadata extraction & 3-5 indexing keywords generation
app.post("/api/router/extract-metadata", async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL string is required" });
    }

    const cleanUrl = url.trim();
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(cleanUrl);
    } catch {
      return res.status(400).json({ error: "Invalid URL provided" });
    }

    let extractedTitle = "";
    let extractedDescription = "";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(cleanUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const html = await response.text();
        const ogTitleMatch = html.match(/<meta\s+[^>]*property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                             html.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+property=["']og:title["']/i);
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const ogDescMatch = html.match(/<meta\s+[^>]*property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                            html.match(/<meta\s+[^>]*name=["']description["']\s+content=["']([^"']+)["']/i);

        if (ogTitleMatch && ogTitleMatch[1]) {
          extractedTitle = ogTitleMatch[1].trim();
        } else if (titleMatch && titleMatch[1]) {
          extractedTitle = titleMatch[1].trim();
        }

        if (ogDescMatch && ogDescMatch[1]) {
          extractedDescription = ogDescMatch[1].trim();
        }
      }
    } catch (fetchErr) {
      // Graceful fallback if fetch blocked or timeout
      console.warn("Server-side URL metadata fetch skipped:", fetchErr);
    }

    // If title not found via HTML fetch, infer from hostname and path
    if (!extractedTitle) {
      const hostname = parsedUrl.hostname.replace(/^www\./, "");
      const pathname = parsedUrl.pathname.replace(/[-_/]/g, " ").trim();
      extractedTitle = pathname ? `${hostname} • ${pathname}` : hostname;
    }

    // Generate 3 to 5 indexing keywords
    let keywords: string[] = [];
    const ai = getGenAI();
    if (ai) {
      try {
        const prompt = `Analiza este recurso web y genera exactamente entre 3 y 5 palabras clave (keywords) en español o inglés para el índice de Búsqueda Universal.
URL: ${cleanUrl}
Título: ${extractedTitle}
Descripción: ${extractedDescription}
Devuelve ÚNICAMENTE un array JSON de 3 a 5 strings cortos y limpios en minúsculas. Ejemplo: ["diseño", "impresión", "lonas", "proveedor"]`;
        const resAi = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
        const text = resAi.text?.trim() || "";
        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
          const parsedKw = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsedKw) && parsedKw.length >= 3) {
            keywords = parsedKw.slice(0, 5).map((k: any) => String(k).trim().toLowerCase());
          }
        }
      } catch (aiErr) {
        console.warn("AI keyword extraction failed, using heuristic:", aiErr);
      }
    }

    // Heuristic keyword generation fallback
    if (keywords.length < 3) {
      const stopWords = new Set([
        "de", "la", "el", "los", "las", "un", "una", "unos", "unas", "y", "o", "a", "en", "para", "por", "con", "sin",
        "the", "and", "or", "of", "to", "in", "for", "with", "on", "at", "by", "from", "com", "org", "net", "http", "https"
      ]);
      const hostParts = parsedUrl.hostname.split(".").filter((p) => p.length > 2 && !stopWords.has(p));
      const textWords = `${extractedTitle} ${extractedDescription} ${parsedUrl.pathname}`
        .toLowerCase()
        .replace(/[^a-záéíóúñ0-9\s]/gi, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w));

      const wordCounts = new Map<string, number>();
      [...hostParts, ...textWords].forEach((w) => {
        wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
      });

      keywords = Array.from(wordCounts.keys())
        .sort((a, b) => (wordCounts.get(b) || 0) - (wordCounts.get(a) || 0))
        .slice(0, 5);

      if (keywords.length < 3) {
        keywords.push("enlace", "recurso", "web");
      }
    }

    // Infer category deterministically
    const combinedContent = `${parsedUrl.hostname} ${extractedTitle} ${extractedDescription} ${keywords.join(" ")}`.toLowerCase();
    let categoria = "Herramientas & Web";
    if (combinedContent.includes("suno") || combinedContent.includes("music") || combinedContent.includes("música") || combinedContent.includes("spotify") || combinedContent.includes("audio") || combinedContent.includes("cancion") || combinedContent.includes("canción") || combinedContent.includes("sound") || combinedContent.includes("podcast")) {
      categoria = "Música & Audio";
    } else if (combinedContent.includes("openai") || combinedContent.includes("chatgpt") || combinedContent.includes("claude") || combinedContent.includes("gemini") || combinedContent.includes("anthropic") || combinedContent.includes("midjourney") || combinedContent.includes("huggingface") || combinedContent.includes("perplexity") || combinedContent.includes(" ai ") || combinedContent.includes("inteligencia artificial") || combinedContent.includes("llm") || combinedContent.includes("copilot")) {
      categoria = "Inteligencia Artificial";
    } else if (combinedContent.includes("canva") || combinedContent.includes("figma") || combinedContent.includes("lona") || combinedContent.includes("diseño") || combinedContent.includes("design") || combinedContent.includes("photoshop") || combinedContent.includes("illustrator") || combinedContent.includes("freepik") || combinedContent.includes("unsplash") || combinedContent.includes("vector") || combinedContent.includes("impresion") || combinedContent.includes("impresión")) {
      categoria = "Diseño & Creatividad";
    } else if (combinedContent.includes("drive") || combinedContent.includes("docs") || combinedContent.includes("sheets") || combinedContent.includes("excel") || combinedContent.includes("notion") || combinedContent.includes("trello") || combinedContent.includes("asana") || combinedContent.includes("calendar") || combinedContent.includes("keep") || combinedContent.includes("productiv") || combinedContent.includes("task") || combinedContent.includes("workspace") || combinedContent.includes("fgdll")) {
      categoria = "Productividad & Trabajo";
    } else if (combinedContent.includes("banco") || combinedContent.includes("bbva") || combinedContent.includes("sat") || combinedContent.includes("factur") || combinedContent.includes("dinero") || combinedContent.includes("finanz") || combinedContent.includes("stripe") || combinedContent.includes("paypal") || combinedContent.includes("pago") || combinedContent.includes("cobro")) {
      categoria = "Finanzas & Bancos";
    } else if (combinedContent.includes("whatsapp") || combinedContent.includes("telegram") || combinedContent.includes("slack") || combinedContent.includes("zoom") || combinedContent.includes("meet") || combinedContent.includes("mail") || combinedContent.includes("gmail") || combinedContent.includes("outlook") || combinedContent.includes("discord")) {
      categoria = "Comunicación";
    } else if (combinedContent.includes("youtube") || combinedContent.includes("vimeo") || combinedContent.includes("netflix") || combinedContent.includes("video") || combinedContent.includes("stream")) {
      categoria = "Multimedia & Streaming";
    }

    const icon = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`;

    return res.json({
      url: cleanUrl,
      title: extractedTitle.slice(0, 300),
      description: extractedDescription.slice(0, 500) || undefined,
      keywords: keywords.slice(0, 5),
      categoria,
      icon,
    });
  } catch (err: any) {
    console.error("Error in /api/router/extract-metadata:", err);
    return res.status(500).json({ error: err.message || "Failed to extract metadata" });
  }
});

app.post("/api/task-os/process", async (req: Request, res: Response) => {
  try {
    const {
      input,
      currentTasks = [],
      currentDate,
      imageBase64,
      imageMimeType = "image/jpeg",
      contacts = [],
      selectedTags = [],
      preassignedCategory,
    } = req.body as ProcessRequestBody;
    const todayStr = currentDate || new Date().toISOString().split("T")[0];

    const ai = getGenAI();

    if (!ai) {
      // Offline fallback processing based on prompt laws
      const fallbackResult = processLocally(input, currentTasks, todayStr, imageBase64, contacts, selectedTags, preassignedCategory);
      return res.json(fallbackResult);
    }

    const promptText = `Fecha actual: ${todayStr}

Agenda / Directorio de contactos conocidos:
${JSON.stringify(contacts, null, 2)}

Ledger actual de tareas existentes:
${JSON.stringify(currentTasks, null, 2)}

Etiquetas seleccionadas por el usuario para esta tarea/mensaje:
${JSON.stringify(selectedTags)}

Categoría / Dominio pre-asignado por el usuario: ${preassignedCategory ? `"${preassignedCategory}"` : "(Ninguno preasignado, clasificar automáticamente)"}

Mensaje o instrucción recibido de Pepe:
"""
${input || "(Sin texto directo, analizar imagen adjunta)"}
"""

${imageBase64 ? "Se ha adjuntado una imagen de referencia. Analiza tanto la imagen como el texto." : ""}

Aplica todas las leyes de Task-OS (Leyes 1 a 27) y devuelve el estado resultante.
${preassignedCategory ? `IMPORTANTE: El usuario pre-asignó la categoría "${preassignedCategory}". Si creas una nueva tarea en el ledger, debes asignar exactamente "${preassignedCategory}" a su campo 'dominio'.` : ""}
Si se crearon tareas nuevas, incluye las etiquetas seleccionadas si aplican.`;

    // Multimodal payload
    let contentsPayload: any = promptText;
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
      contentsPayload = {
        parts: [
          {
            inlineData: {
              mimeType: imageMimeType,
              data: cleanBase64,
            },
          },
          {
            text: promptText,
          },
        ],
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: contentsPayload,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mensajeParaEnviar: {
              type: Type.STRING,
              description: "Mensaje principal listo para WhatsApp o 'No aplica.'",
            },
            mensajesMultiples: {
              type: Type.ARRAY,
              description: "Lista de mensajes para mandar por WhatsApp a uno o múltiples contactos",
              items: {
                type: Type.OBJECT,
                properties: {
                  destinatario: { type: Type.STRING },
                  telefono: { type: Type.STRING },
                  mensaje: { type: Type.STRING },
                },
                required: ["destinatario", "mensaje"],
              },
            },
            tasks: {
              type: Type.ARRAY,
              description: "Lista completa y acumulada del Ledger Maestro de Tareas.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  solicitante: { type: Type.STRING },
                  tarea: { type: Type.STRING },
                  estado: {
                    type: Type.STRING,
                    enum: ["Pendiente", "En Proceso", "Completado"],
                  },
                  fechaIngreso: { type: Type.STRING },
                  dominio: { type: Type.STRING },
                  contacto: {
                    type: Type.OBJECT,
                    properties: {
                      nombre: { type: Type.STRING },
                      telefono: { type: Type.STRING },
                    },
                  },
                  etiquetas: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  notas: {
                    type: Type.STRING,
                    description: "Sub-notas u observaciones sobre la tarea sin abarrotar la descripción principal.",
                  },
                },
                required: ["id", "solicitante", "tarea", "estado", "fechaIngreso"],
              },
            },
            tareaEsencialId: { type: Type.INTEGER },
            tareasSecundariasIds: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
            },
            activarPomodoro: { type: Type.BOOLEAN },
            pomodoroTarea: { type: Type.STRING },
            pomodoroMinutos: { type: Type.INTEGER },
            resumenAccion: { type: Type.STRING },
          },
          required: ["tasks", "activarPomodoro"],
        },
      },
    });

    const jsonText = response.text?.trim() || "{}";
    const parsed = JSON.parse(jsonText);

    // Preserve existing notes, tags, or reference images for existing tasks
    if (parsed.tasks && Array.isArray(parsed.tasks)) {
      parsed.tasks.forEach((t: any) => {
        const existing = currentTasks.find((c: any) => c.id === t.id);
        if (existing) {
          if (existing.notas && !t.notas) {
            t.notas = existing.notas;
          }
          if (existing.imagenReferencia && !t.imagenReferencia) {
            t.imagenReferencia = existing.imagenReferencia;
          }
          if (existing.etiquetas && (!t.etiquetas || t.etiquetas.length === 0)) {
            t.etiquetas = existing.etiquetas;
          }
        }
      });
    }

    // If image was provided, attach to the latest created or updated task if it doesn't have one
    if (imageBase64 && parsed.tasks && parsed.tasks.length > 0) {
      const highestId = Math.max(...parsed.tasks.map((t: any) => t.id));
      const target = parsed.tasks.find((t: any) => t.id === highestId);
      if (target && !target.imagenReferencia) {
        target.imagenReferencia = imageBase64;
      }
    }

    // If selectedTags were passed, ensure latest task gets them
    if (selectedTags && selectedTags.length > 0 && parsed.tasks && parsed.tasks.length > 0) {
      const highestId = Math.max(...parsed.tasks.map((t: any) => t.id));
      const target = parsed.tasks.find((t: any) => t.id === highestId);
      if (target) {
        target.etiquetas = Array.from(new Set([...(target.etiquetas || []), ...selectedTags]));
      }
    }

    return res.json(parsed);
  } catch (error) {
    console.error("Error processing with Gemini API, running local fallback:", error);
    const {
      input,
      currentTasks = [],
      currentDate,
      imageBase64,
      contacts = [],
      selectedTags = [],
      preassignedCategory,
    } = req.body as ProcessRequestBody;
    const todayStr = currentDate || new Date().toISOString().split("T")[0];
    const fallbackResult = processLocally(input, currentTasks, todayStr, imageBase64, contacts, selectedTags, preassignedCategory);
    return res.json(fallbackResult);
  }
});

// Deterministic fallback rule-engine implementing Task-OS laws
function processLocally(
  input: string,
  currentTasks: TaskItem[],
  todayStr: string,
  imageBase64?: string,
  contacts: Contact[] = [],
  selectedTags: string[] = [],
  preassignedCategory?: string
) {
  const trimmed = (input || "").trim();
  const lower = trimmed.toLowerCase();

  let nextId = currentTasks.length > 0 ? Math.max(...currentTasks.map((t) => t.id)) + 1 : 1;
  const updatedTasks = [...currentTasks];
  let mensajeParaEnviar: string | null = "No aplica.";
  let activarPomodoro = false;
  let pomodoroTarea: string | null = null;
  let pomodoroMinutos = 25;
  let resumenAccion = "Ledger actualizado";

  // Check Pomodoro intent (Ley 27)
  if (
    lower.includes("pomodoro") ||
    lower.includes("modo foco") ||
    lower.includes("enfocar") ||
    lower.includes("enfoque") ||
    lower.includes("timer") ||
    lower.includes("25 min")
  ) {
    activarPomodoro = true;
    // Extract task name if specified
    const matchFocus = lower.match(/(?:enfo(?:car|que)\s+en|pomodoro\s+en|para)\s+([^.]+)/i);
    if (matchFocus && matchFocus[1]) {
      pomodoroTarea = matchFocus[1].trim();
    } else {
      const active = currentTasks.find((t) => t.estado === "En Proceso" || t.estado === "Pendiente");
      pomodoroTarea = active ? active.tarea : "Sesión de Enfoque";
    }
    resumenAccion = `Sesión de enfoque activada para: ${pomodoroTarea}`;
    return {
      mensajeParaEnviar: "No aplica.",
      tasks: updatedTasks,
      tareaEsencialId: updatedTasks[0]?.id || null,
      tareasSecundariasIds: updatedTasks.slice(1, 3).map((t) => t.id),
      activarPomodoro: true,
      pomodoroTarea,
      pomodoroMinutos,
      resumenAccion,
    };
  }

  // Check completion (Ley 15 & 16)
  const matchFinish = lower.match(/(?:termin[eé]|listo|ya qued[oó]|complet(?:e|ado))\s+(?:el|la|id|tarea)?\s*#?(\d+)/i);
  if (matchFinish && matchFinish[1]) {
    const targetId = parseInt(matchFinish[1], 10);
    const taskIndex = updatedTasks.findIndex((t) => t.id === targetId);
    if (taskIndex !== -1) {
      updatedTasks[taskIndex].estado = "Completado";
      const task = updatedTasks[taskIndex];
      if (task.solicitante && task.solicitante.toLowerCase() !== "pepe") {
        mensajeParaEnviar = `Ya quedó listo: ${task.tarea.replace(/^[a-zñáéíóú\s]+(?=para|de|los|la|el)/i, "").trim() || "lo que me pediste"}. Te lo comparto por aquí.`;
      } else {
        mensajeParaEnviar = "No aplica.";
      }
      resumenAccion = `Tarea #${targetId} marcada como Completada`;
      return {
        mensajeParaEnviar,
        tasks: updatedTasks,
        tareaEsencialId: updatedTasks.find((t) => t.estado !== "Completado")?.id || null,
        tareasSecundariasIds: updatedTasks.filter((t) => t.estado !== "Completado").slice(1, 3).map((t) => t.id),
        activarPomodoro: false,
        resumenAccion,
      };
    }
  }

  // Check if informational / no action (Ley 21 & 22)
  if (
    (lower.startsWith("gracias") || lower.startsWith("hola") || lower.includes("le gustó cómo")) &&
    !lower.includes("necesito") &&
    !lower.includes("falta") &&
    !lower.includes("acuérdate")
  ) {
    return {
      mensajeParaEnviar: "No aplica.",
      tasks: updatedTasks,
      tareaEsencialId: updatedTasks.find((t) => t.estado !== "Completado")?.id || null,
      tareasSecundariasIds: updatedTasks.filter((t) => t.estado !== "Completado").slice(1, 3).map((t) => t.id),
      activarPomodoro: false,
      resumenAccion: "Mensaje informativo recibido; no genera tarea.",
    };
  }

  // Extract applicant (Ley 10, 11, 12)
  let solicitante = "Pepe";
  let cleanTaskText = trimmed;
  let domain = preassignedCategory || "Personal";

  if (lower.includes("laura")) {
    solicitante = "Laura";
    if (!preassignedCategory) domain = "Laura";
  } else if (lower.includes("tiburón") || lower.includes("tiburon")) {
    solicitante = "Líder Zona Tiburón";
    if (!preassignedCategory) domain = "FGDLL";
  } else if (lower.includes("gladiadores")) {
    solicitante = "Director Gladiadores";
    if (!preassignedCategory) domain = "FGDLL";
  } else if (lower.includes("diplomado") || lower.includes("universidad")) {
    solicitante = "Universidad FGDLL";
    if (!preassignedCategory) domain = "Universidad";
  } else if (lower.includes("proveedor") || lower.includes("lona") || lower.includes("impresión")) {
    if (!preassignedCategory) domain = "Diseño";
  } else if (lower.includes("l.fgdll.org") || lower.includes("fgdll.org") || lower.includes("panel") || lower.includes("github")) {
    if (!preassignedCategory) domain = "Tecnología";
  }

  // Create action-oriented task (Ley 5)
  let actionTask = cleanTaskText
    .replace(/^mensaje\s+(?:de\s+[^:]+:?|:)/i, "")
    .replace(/^(?:oye,?\s*|pepe,?\s*|porfa,?\s*|por\s+favor,?\s*)/i, "")
    .trim();

  // If missing initial action verb, prepend appropriate verb
  if (!/^(preparar|revisar|diseñar|enviar|subir|crear|actualizar|corregir|organizar|terminar|contactar|consultar|resolver)/i.test(actionTask)) {
    if (lower.includes("lona")) {
      actionTask = "Diseñar y enviar " + actionTask;
    } else if (lower.includes("reconocimiento")) {
      actionTask = "Revisar y corregir los reconocimientos " + actionTask;
    } else if (lower.includes("panel")) {
      actionTask = "Revisar y actualizar el panel de administración " + actionTask;
    } else {
      actionTask = "Revisar y dar seguimiento a " + actionTask;
    }
  }

  // Capitalize
  actionTask = actionTask.charAt(0).toUpperCase() + actionTask.slice(1);

  // Match contact if available
  const matchedContact = contacts.find(
    (c) =>
      c.nombre.toLowerCase().includes(solicitante.toLowerCase()) ||
      solicitante.toLowerCase().includes(c.nombre.toLowerCase())
  );

  // Add task to ledger
  updatedTasks.push({
    id: nextId,
    solicitante,
    tarea: actionTask,
    estado: "En Proceso",
    fechaIngreso: todayStr,
    dominio: domain,
    imagenReferencia: imageBase64,
    contacto: matchedContact
      ? { nombre: matchedContact.nombre, telefono: matchedContact.telefono }
      : undefined,
    etiquetas: selectedTags.length > 0 ? selectedTags : undefined,
  });

  // Compose WhatsApp reply if external (Ley 13, 14)
  if (solicitante !== "Pepe") {
    if (solicitante === "Laura") {
      mensajeParaEnviar = `Sí, ya lo tengo anotado. Lo reviso y te aviso cuando quede listo.`;
    } else if (solicitante === "Líder Zona Tiburón") {
      mensajeParaEnviar = `Ya tengo anotada la solicitud. La considero con prioridad y te aviso en cuanto esté lista.`;
    } else {
      mensajeParaEnviar = `Ya lo tengo anotado. Lo reviso y te confirmo en cuanto quede listo.`;
    }
  } else {
    mensajeParaEnviar = "No aplica.";
  }

  const activeTasks = updatedTasks.filter((t) => t.estado !== "Completado");
  const tareaEsencialId = activeTasks[0]?.id || null;
  const tareasSecundariasIds = activeTasks.slice(1, 3).map((t) => t.id);

  const mensajesMultiples: Array<{ destinatario: string; telefono?: string; mensaje: string }> = [];
  if (mensajeParaEnviar && mensajeParaEnviar !== "No aplica.") {
    mensajesMultiples.push({
      destinatario: solicitante,
      telefono: matchedContact?.telefono,
      mensaje: mensajeParaEnviar,
    });
  }

  return {
    mensajeParaEnviar,
    mensajesMultiples,
    tasks: updatedTasks,
    tareaEsencialId,
    tareasSecundariasIds,
    activarPomodoro: false,
    resumenAccion: `Tarea registrada con ID #${nextId} para ${solicitante}${imageBase64 ? " con imagen de referencia" : ""}`,
  };
}

async function startServer() {
  const distPath = path.join(process.cwd(), "dist");
  const isProdWithDist = process.env.NODE_ENV === "production" && fs.existsSync(path.join(distPath, "index.html"));

  if (!isProdWithDist) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Task-OS server running on http://0.0.0.0:${PORT}`);
  });

  httpServer.on("error", (err: any) => {
    console.error(`Error on port ${PORT}:`, err.message);
  });

  // If running on a different port (e.g. Cloud Run PORT=8080), also try binding port 3000
  if (PORT !== 3000) {
    try {
      const secondaryServer = http.createServer(app);
      secondaryServer.listen(3000, "0.0.0.0", () => {
        console.log(`Task-OS also listening on http://0.0.0.0:3000`);
      });
      secondaryServer.on("error", () => {
        // Port 3000 already bound or not allowed, ignore silently
      });
    } catch {
      // Ignore
    }
  }
}

startServer();
