export interface Contact {
  id: string;
  nombre: string;
  telefono: string; // e.g. "5215512345678" or "+52 55 1234 5678" or "19999011852"
  rol?: string; // e.g. "Coordinación", "Líder Zona", "Proveedor"
  dominio?: string; // e.g. "Laura", "FGDLL", "Diseño", "Lonas", "Finanzas"
  etiquetas?: string[]; // Array of tag names or IDs
  email?: string;
  empresa?: string;
  notas?: string;
}

export interface WhatsAppMessageItem {
  id: string;
  destinatario: string;
  telefono?: string;
  mensaje: string;
  tareaId?: number;
  enviado?: boolean;
}

export type TagCategory = "prioridad" | "zona" | "area";

export interface TagItem {
  id: string;
  nombre: string;
  categoria: TagCategory;
  color: string; // "rose" | "amber" | "blue" | "purple" | "cyan" | "emerald" | "orange" | "violet" | "stone"
}

export interface TaskResource {
  url: string;
  title: string;
  addedAt: string;
}

export interface TaskItem {
  id: number;
  solicitante: string;
  tarea: string;
  estado: "Pendiente" | "En Proceso" | "Completado";
  fechaIngreso: string;
  dominio?: string;
  imagenReferencia?: string; // Base64 data URL
  contacto?: {
    nombre: string;
    telefono?: string;
  };
  etiquetas?: string[]; // Array of tag names or IDs
  notas?: string; // Sub-notas u observaciones persistentes de la tarea
  fechaLimite?: string; // YYYY-MM-DD fecha límite / deadline de entrega
  resources?: TaskResource[]; // Contextual links/resources attached to this task (Ley del Foco)
  googleTaskId?: string; // ID de Google Tasks vinculado
  googleCalendarEventId?: string; // ID del Evento en Google Calendar vinculado
  googleCalendarHtmlLink?: string; // Enlace web directo al evento de Google Calendar
  googleSyncStatus?: "synced" | "pending" | "conflict";
  lastGoogleSync?: string; // Marca de tiempo ISO del último sincronizado
  fechaCompletado?: string; // ISO timestamp when status changed to Completado
}

export interface GlobalResource {
  id: string;
  url: string;
  title: string;
  keywords: string[];
  savedAt: string;
}

export interface UrlLibraryItem {
  id: string;
  url: string;
  title: string;
  categoria?: string;
  descripcion?: string;
  keywords?: string[];
  icon?: string;
  isFavorite?: boolean;
  clicks?: number;
  lastOpenedAt?: string;
  isDesignFile?: boolean; // Indica si es el archivo de diseño creado en Google Drive
  driveUrl?: string; // Link directo a Google Drive
  relatedOrderId?: string; // ID del pedido de Lonas vinculado (ej. lon-008)
  relatedOrderFolio?: number; // Folio de lona vinculado (ej. 8 para L-008)
  clienteNombre?: string;
  empresaZona?: string;
  createdAt: string;
  updatedAt?: string;
}

export type UrlViewMode = "grid" | "list" | "categories" | "daily";

export type RouterAction = "ROUTE_RESOURCE" | "CREATE_TASK" | "UNIVERSAL_SEARCH" | "SAVE_URL_LIBRARY";

export interface RouterDestination {
  type: "TASK" | "GLOBAL" | "URL_LIBRARY" | null;
  taskId: string | null;
}

export interface RouterPayload {
  url?: string;
  urls?: string[];
  title?: string;
  keywords?: string[];
  categoria?: string;
  descripcion?: string;
  taskText?: string;
  searchQuery?: string;
}

export interface RouterStructuredOutput {
  action: RouterAction;
  payload: RouterPayload;
  destination: RouterDestination;
  system_log: string;
  timestamp?: string;
}

export interface UniversalSearchResult {
  id: string;
  title: string;
  url?: string;
  source: string; // e.g. "Tarea: Revisar reconocimientos" or "Archivo global" or "Biblioteca URLs"
  sourceType: "task_title" | "task_resource" | "global_resource" | "url_library";
  taskId?: number;
  taskTitle?: string;
  keywords?: string[];
  categoria?: string;
  matchType: "title" | "keyword" | "content";
  addedAt?: string;
}

export interface TaskOSExportData {
  version: number;
  exportedAt: string;
  tasks: TaskItem[];
  globalResources: GlobalResource[];
  urlLibrary?: UrlLibraryItem[];
  contacts?: Contact[];
  tags?: TagItem[];
  esencialTaskId?: number | null;
}

export interface TaskOSResponse {
  mensajeParaEnviar?: string | null;
  mensajesMultiples?: Array<{
    destinatario: string;
    telefono?: string;
    mensaje: string;
  }>;
  tasks: TaskItem[];
  tareaEsencialId?: number | null;
  tareasSecundariasIds?: number[];
  activarPomodoro?: boolean;
  pomodoroTarea?: string | null;
  pomodoroMinutos?: number;
  resumenAccion?: string;
  dominioDetectado?: string;
}

export type DomainType =
  | "Todos"
  | "FGDLL"
  | "Universidad"
  | "Tecnología"
  | "Technology"
  | "Diseño"
  | "Profesional"
  | "Personal"
  | "Laura"
  | "Lonas"
  | "Finanzas";

export type WorkspaceTab = "task-os" | "lonas" | "finanzas" | "urls" | "print" | "pomodoro" | "analytics";

/* =========================================================
   PRINT STATION & VOUCHER TYPES (🖨️ Comprobantes, Tickets y Recibos)
========================================================= */
export type PrintDocType =
  | "ticket_lona"
  | "comprobante_pago"
  | "reporte_tarea"
  | "estado_cuenta"
  | "recibo_general";

export interface PrintItem {
  id: string;
  tipo: PrintDocType;
  folio?: string;
  titulo: string;
  clienteNombre: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  empresaZona?: string;
  fecha: string;
  fechaEntrega?: string;
  items?: Array<{
    descripcion: string;
    detalle?: string;
    cantidad?: number;
    subtotal?: number;
  }>;
  total: number;
  anticipo?: number;
  saldo?: number;
  metodoPago?: string;
  estado?: string;
  notas?: string;
  origen?: "lonas" | "finanzas" | "task-os" | "out" | "manual";
  referenciaId?: string;
  driveUrl?: string; // Link de Google Drive con el archivo del diseño creado
  createdAt: string;
}

export type StatusFilter = "Todos" | "Pendiente" | "En Proceso" | "Completado" | "Activas";

export interface SyncStatus {
  email: string;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error?: string | null;
  isConnected?: boolean;
  deviceType?: "mobile" | "desktop";
}

export interface CloudSyncPayload {
  email: string;
  tasks: TaskItem[];
  globalResources?: GlobalResource[];
  urlLibrary?: UrlLibraryItem[];
  contacts?: Contact[];
  tags?: TagItem[];
  esencialTaskId?: number | null;
  secundariasTaskIds?: number[];
  deviceName?: string;
  updatedAt?: string;
}

/* =========================================================
   MUSIC & PLAYLIST PLAYER TYPES (Spotify, YouTube Music, Suno, Google Drive, Local Folder, Web)
========================================================= */
export type MusicPlatform = "spotify" | "youtube" | "suno" | "gdrive" | "local" | "web";

export interface WorkPlaylist {
  id: string;
  title: string;
  platform: MusicPlatform;
  url: string;
  embedUrl: string;
  description: string;
  isCustom?: boolean;
}

/* =========================================================
   POMODORO LOGS & PERFORMANCE TYPES (Módulo de Rendimiento Semanal)
========================================================= */
export interface PomodoroLogEntry {
  id: string;
  taskId?: number | null;
  taskName: string;
  durationMinutes: number;
  completedAt: string; // ISO string
  date: string; // YYYY-MM-DD
  mode: "work" | "shortBreak" | "longBreak";
  category?: string;
}

/* =========================================================
   LONAS OS TYPES (Gran Formato, Cotizaciones, Pedidos, Producción, Cobros)
========================================================= */
export type LonasStatus =
  | "Cotización"
  | "Diseño"
  | "Esperando aprobación"
  | "Aprobado"
  | "Producción"
  | "Listo"
  | "Entregado";

export interface LonasOrderItem {
  id: string;
  descripcion: string; // e.g. "Lona Front 13oz", "Vinil brillante", "Estructura banner"
  ancho: number; // metros
  alto: number; // metros
  cantidad: number;
  m2: number; // ancho * alto * cantidad
  costoPorM2: number;
  precioVentaPorM2: number;
  costoCalculado: number;
  precioCalculado: number;
  precioFinal: number; // editable
  costoFinal: number;
  observaciones?: string;
}

export interface LonasPayment {
  id: string;
  fecha: string;
  monto: number;
  metodo: "Efectivo" | "Transferencia" | "Depósito" | "Tarjeta";
  referencia?: string;
  nota?: string;
}

export interface LonasOrder {
  id: string;
  folio: number; // e.g. 101, 102...
  cliente: {
    nombre: string;
    telefono: string;
    empresa?: string;
    email?: string;
  };
  items: LonasOrderItem[];
  subtotal: number;
  descuento: number;
  total: number;
  anticipo: number;
  pagos: LonasPayment[];
  saldo: number; // total - suma de pagos
  estado: LonasStatus;
  fechaIngreso: string;
  fechaEntregaEstimada: string;
  comprobanteUrl?: string;
  driveUrl?: string; // Link de Google Drive donde está el archivo del diseño creado
  notasInternas?: string;
  notasCliente?: string;
  entregadoAt?: string;
}

/* =========================================================
   MI SALUD FINANCIERA TYPES (Flujo de Efectivo, Disponible Real, Deudas)
========================================================= */
export type AccountType = "Efectivo" | "Cuenta Bancaria" | "Tarjeta Débito" | "Billetera Digital" | "Ahorro";

export interface FinancialAccount {
  id: string;
  nombre: string;
  tipo: AccountType;
  saldoActual: number;
  notas?: string;
}

export interface ExpectedIncome {
  id: string;
  concepto: string;
  montoEsperado: number;
  fechaEsperada: string;
  montoRecibido: number;
  estado: "Esperado" | "Parcial" | "Recibido" | "Atrasado" | "Cancelado";
  categoria: string;
  cuentaDestinoId?: string;
  notas?: string;
}

export interface FinancialDebtPayment {
  id: string;
  fecha: string;
  monto: number;
  cuentaOrigenId: string;
  nota?: string;
}

export interface FinancialDebt {
  id: string;
  acreedor: string;
  concepto: string;
  montoOriginal: number;
  saldoActual: number;
  vencimiento: string;
  pagoMinimo: number;
  prioridad: "Alta" | "Media" | "Baja";
  estado: "Activa" | "Liquidada";
  historialPagos: FinancialDebtPayment[];
  notas?: string;
}

export interface FinancialCommitment {
  id: string;
  concepto: string;
  monto: number;
  fechaVencimiento: string;
  categoria: string;
  esRecurrente?: boolean;
  periodicidad?: "Semanal" | "Quincenal" | "Mensual" | "Anual";
  pagado?: boolean;
}

export interface FinancialAllocation {
  id: string;
  concepto: string;
  montoApartado: number;
  estado: "Apartado" | "Usado" | "Liberado";
  compromisoId?: string;
}

export interface EcosystemSyncPayload {
  email: string;
  tasks: TaskItem[];
  lonasOrders: LonasOrder[];
  financialAccounts: FinancialAccount[];
  financialIncomes: ExpectedIncome[];
  financialDebts: FinancialDebt[];
  financialCommitments: FinancialCommitment[];
  financialAllocations: FinancialAllocation[];
  updatedAt: string;
}

export interface SolicitudItem {
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

export interface NotificationCenterItem {
  id: string;
  tipo: "solicitud_nueva" | "tarea_completada" | "mensaje_cliente" | "alerta_sistema";
  titulo: string;
  mensaje: string;
  solicitante?: string;
  telefono?: string;
  solicitudId?: string;
  tareaId?: number;
  leida: boolean;
  creadaEn: string;
  emailEnviado?: boolean;
  pushEnviado?: boolean;
}



