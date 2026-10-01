import React, { useState, useEffect } from "react";
import {
  X,
  Cloud,
  QrCode,
  Smartphone,
  Laptop,
  RefreshCw,
  Bell,
  BellRing,
  Download,
  Users,
  Tag as TagIcon,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Bookmark,
  Printer,
  TrendingUp,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Flame,
  Check,
  Copy,
  Settings,
  Volume2,
  VolumeX,
  Radio,
  Clock,
  Sliders,
  AlertTriangle,
  Info,
  KeyRound,
  Mail,
  Zap,
  CheckCheck,
  Activity,
} from "lucide-react";
import { SyncStatus, WorkspaceTab } from "../types";
import { playChime, ChimeType } from "../utils/audio";
import QRCode from "qrcode";

export interface NotificationSettings {
  pushEnabled?: boolean;
  taskCompleted: boolean;
  pomodoroEnded: boolean;
  newSolicitudes: boolean;
  urgentReminders?: boolean;
  soundChimes: boolean;
  soundVolume?: number; // 0.1 to 1.0
  soundType?: "bell" | "zen" | "work_done" | "urgent";
  focusDoNotDisturb: boolean;
}

export interface ConnectionSyncMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: SyncStatus;
  isPushActive?: boolean;
  unreadSolicitudesCount?: number;
  tasksCount?: number;
  onForceSync: () => void;
  onChangeEmail?: (newEmail: string) => void;
  onOpenQRAndCloudSync: () => void;
  onOpenGoogleWorkspace: () => void;
  onOpenNotifications: () => void;
  onOpenExportImport: () => void;
  onOpenContacts: () => void;
  onOpenTags: () => void;
  onNavigateToWorkspace?: (ws: WorkspaceTab) => void;
  onResetLedger?: () => void;
  // Sincronizado Automático props
  autoSyncEnabled?: boolean;
  onToggleAutoSync?: (enabled: boolean) => void;
  autoSyncInterval?: number;
  onChangeAutoSyncInterval?: (interval: number) => void;
  secondsUntilSync?: number;
  lastSyncTime?: Date;
  syncHistory?: { time: string; count: number; email: string }[];
  // Configuración de Notificaciones props
  notifConfig?: NotificationSettings;
  onUpdateNotifConfig?: (updates: Partial<NotificationSettings>) => void;
  onSendTestNotification?: () => void;
}

export default function ConnectionSyncMenuModal({
  isOpen,
  onClose,
  syncStatus,
  isPushActive = false,
  unreadSolicitudesCount = 0,
  tasksCount = 0,
  onForceSync,
  onChangeEmail,
  onOpenQRAndCloudSync,
  onOpenGoogleWorkspace,
  onOpenNotifications,
  onOpenExportImport,
  onOpenContacts,
  onOpenTags,
  onNavigateToWorkspace,
  onResetLedger,
  autoSyncEnabled = true,
  onToggleAutoSync,
  autoSyncInterval = 30,
  onChangeAutoSyncInterval,
  secondsUntilSync = 30,
  lastSyncTime = new Date(),
  syncHistory = [],
  notifConfig = {
    pushEnabled: true,
    taskCompleted: true,
    pomodoroEnded: true,
    newSolicitudes: true,
    urgentReminders: true,
    soundChimes: true,
    soundVolume: 0.8,
    soundType: "bell",
    focusDoNotDisturb: false,
  },
  onUpdateNotifConfig,
  onSendTestNotification,
}: ConnectionSyncMenuModalProps) {
  const [activeTab, setActiveTab] = useState<"connections" | "autosync" | "notifications">("connections");
  const [justSynced, setJustSynced] = useState(false);
  const [copiedSse, setCopiedSse] = useState(false);
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [testNotifSent, setTestNotifSent] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>("default");

  // Health check and connection testing state
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
    details?: any;
  } | null>(null);

  // MCP test state
  const [isTestingMcp, setIsTestingMcp] = useState(false);
  const [mcpTestResult, setMcpTestResult] = useState<{
    success: boolean;
    toolsCount: number;
    message: string;
  } | null>(null);

  // PIN Pairing State
  const [pairingPinCode, setPairingPinCode] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState<string>("");
  const [isGeneratingPin, setIsGeneratingPin] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [pinFeedback, setPinFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Email input state
  const [emailInputValue, setEmailInputValue] = useState(syncStatus.email || "laurcortazar@gmail.com");
  const [emailUpdatedFeedback, setEmailUpdatedFeedback] = useState(false);

  // QR Code preview in modal
  const [showQrPreview, setShowQrPreview] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionStatus(Notification.permission);
    }
  }, [isOpen]);

  useEffect(() => {
    if (syncStatus.email) {
      setEmailInputValue(syncStatus.email);
    }
  }, [syncStatus.email]);

  // Generate QR code for mobile connection
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    const targetEmail = syncStatus.email || "laurcortazar@gmail.com";
    const pairingUrl = `${window.location.origin}${window.location.pathname}?syncEmail=${encodeURIComponent(
      targetEmail.trim()
    )}`;
    QRCode.toDataURL(pairingUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: "#1c1917",
        light: "#ffffff",
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error("Error generating QR preview:", err));
  }, [isOpen, syncStatus.email]);

  if (!isOpen) return null;

  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : "https://ais-pre-dwgikgfu64evytiqb4nzms-347865637985.us-east1.run.app";

  const sseUrl = `${baseUrl}/sse`;
  const mcpUrl = `${baseUrl}/mcp`;

  const handleCopySse = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sseUrl);
    setCopiedSse(true);
    playChime("success", { volume: notifConfig.soundVolume });
    setTimeout(() => setCopiedSse(false), 3000);
  };

  const handleCopyMcp = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(mcpUrl);
    setCopiedMcp(true);
    playChime("success", { volume: notifConfig.soundVolume });
    setTimeout(() => setCopiedMcp(false), 3000);
  };

  const handleSyncClick = () => {
    onForceSync();
    playChime("tick", { volume: notifConfig.soundVolume });
    setJustSynced(true);
    setTimeout(() => setJustSynced(false), 2000);
  };

  // Test Cloud Connection with latency measurement
  const handleTestCloudConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    const start = performance.now();
    try {
      const emailToTest = syncStatus.email || "laurcortazar@gmail.com";
      const res = await fetch(`/api/sync/health?email=${encodeURIComponent(emailToTest)}`);
      const latency = Math.round(performance.now() - start);
      const data = await res.json();

      if (res.ok && data.success) {
        setConnectionTestResult({
          success: true,
          latencyMs: latency,
          message: `¡Conexión 100% activa! Servidor online, ${data.tasksCount} tareas respaldadas en la nube.`,
          details: data,
        });
        playChime("success", { volume: notifConfig.soundVolume });
      } else {
        throw new Error(data.error || "Respuesta inválida del servidor");
      }
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      setConnectionTestResult({
        success: false,
        latencyMs: latency,
        message: `Error al conectar: ${err.message || "Servidor inaccesible"}`,
      });
      playChime("urgent", { volume: notifConfig.soundVolume });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Test Gemini MCP Server Live
  const handleTestMcpServer = async () => {
    setIsTestingMcp(true);
    setMcpTestResult(null);
    try {
      const res = await fetch("/mcp?format=json");
      const data = await res.json();
      if (res.ok && data.tools) {
        setMcpTestResult({
          success: true,
          toolsCount: data.tools.length,
          message: `Servidor MCP validado. ${data.tools.length} herramientas disponibles para Google Gemini.`,
        });
        playChime("success", { volume: notifConfig.soundVolume });
      } else {
        throw new Error("No se pudo obtener el esquema de herramientas MCP");
      }
    } catch (err: any) {
      setMcpTestResult({
        success: false,
        toolsCount: 0,
        message: `Fallo de validación MCP: ${err.message}`,
      });
      playChime("urgent", { volume: notifConfig.soundVolume });
    } finally {
      setIsTestingMcp(false);
    }
  };

  // Generate 6-Digit PIN
  const handleGeneratePin = async () => {
    setIsGeneratingPin(true);
    setPinFeedback(null);
    try {
      const targetEmail = syncStatus.email || "laurcortazar@gmail.com";
      const res = await fetch("/api/sync/pair-code/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json();
      if (data.success && data.code) {
        setPairingPinCode(data.code);
        playChime("success", { volume: notifConfig.soundVolume });
      } else {
        throw new Error(data.error || "No se pudo generar código");
      }
    } catch (err: any) {
      setPinFeedback({ success: false, message: err.message });
      playChime("urgent", { volume: notifConfig.soundVolume });
    } finally {
      setIsGeneratingPin(false);
    }
  };

  // Verify and Link PIN
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;

    setIsVerifyingPin(true);
    setPinFeedback(null);
    try {
      const res = await fetch("/api/sync/pair-code/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: pinInput.trim() }),
      });
      const data = await res.json();
      if (data.success && data.email) {
        setPinFeedback({
          success: true,
          message: `¡Dispositivo vinculado con éxito a ${data.email}! Sincronizando...`,
        });
        if (onChangeEmail) {
          onChangeEmail(data.email);
        }
        playChime("success", { volume: notifConfig.soundVolume });
        onForceSync();
        setPinInput("");
        setTimeout(() => setPinFeedback(null), 5000);
      } else {
        throw new Error(data.error || "Código PIN inválido");
      }
    } catch (err: any) {
      setPinFeedback({ success: false, message: err.message });
      playChime("urgent", { volume: notifConfig.soundVolume });
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Save Email Directly
  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = emailInputValue.trim().toLowerCase();
    if (!clean || !clean.includes("@")) return;

    if (onChangeEmail) {
      onChangeEmail(clean);
    }
    playChime("success", { volume: notifConfig.soundVolume });
    setEmailUpdatedFeedback(true);
    onForceSync();
    setTimeout(() => setEmailUpdatedFeedback(false), 3000);
  };

  const handleRequestPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const res = await Notification.requestPermission();
        setPermissionStatus(res);
        if (res === "granted") {
          playChime("success", { volume: notifConfig.soundVolume });
          new Notification("🔔 Notificaciones Activadas en Task-OS", {
            body: "Recibirás avisos de tareas completadas, ciclo Pomodoro y solicitudes.",
            icon: "/icon-192.svg",
          });
        }
      } catch (e) {
        console.error("Error requesting permission:", e);
      }
    }
  };

  const handleTestNotification = () => {
    const tone = notifConfig.soundType || "bell";
    playChime(tone as ChimeType, { volume: notifConfig.soundVolume });
    setTestNotifSent(true);

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification("🔔 Notificación de Prueba — Task-OS", {
        body: "¡Configuración de notificaciones 100% activa! Alertas y sonido sincronizados.",
        icon: "/icon-192.svg",
      });
    }
    if (onSendTestNotification) {
      onSendTestNotification();
    }
    setTimeout(() => setTestNotifSent(false), 3000);
  };

  const handleSoundSample = (type: ChimeType) => {
    playChime(type, { volume: notifConfig.soundVolume, force: true });
    if (onUpdateNotifConfig) {
      onUpdateNotifConfig({ soundType: type as any });
    }
  };

  const handleAction = (callback: () => void) => {
    playChime("tick", { volume: notifConfig.soundVolume });
    onClose();
    callback();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700" />
        </div>

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Cloud size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-stone-900 dark:text-stone-100 text-base sm:text-lg tracking-tight">
                  Centro de Conexión & Sincronización
                </h3>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Vincula iPhone 16 Pro Max, Google Gemini MCP y configura alertas automáticas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/80 dark:hover:bg-stone-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        {/* Primary Navigation Tabs */}
        <div className="flex items-center border-b border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-950/60 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("connections")}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[40px] ${
              activeTab === "connections"
                ? "bg-white dark:bg-stone-800 text-stone-950 dark:text-stone-50 shadow-xs"
                : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            <Cloud size={14} className="text-amber-500" />
            <span>Conexión & Dispositivos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("autosync")}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[40px] ${
              activeTab === "autosync"
                ? "bg-white dark:bg-stone-800 text-stone-950 dark:text-stone-50 shadow-xs"
                : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            <RefreshCw size={14} className={autoSyncEnabled ? "text-emerald-500" : "text-stone-400"} />
            <span>Sincronizado Auto</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[40px] relative ${
              activeTab === "notifications"
                ? "bg-white dark:bg-stone-800 text-stone-950 dark:text-stone-50 shadow-xs"
                : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            <Bell size={14} className="text-rose-500" />
            <span>Notificaciones</span>
            {unreadSolicitudesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* TAB 1: CONEXIÓN & DISPOSITIVOS & MCP */}
          {activeTab === "connections" && (
            <div className="space-y-4">
              {/* SECTION: REAL-TIME CONNECTION STATUS CARD */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 text-white border border-stone-700/80 shadow-md space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                        {syncStatus.error ? "Aviso de Conexión" : "Conectado y Sincronizado"}
                      </span>
                    </div>
                    <div className="text-base font-black text-stone-100 flex items-center gap-2">
                      <span>{syncStatus.email || "laurcortazar@gmail.com"}</span>
                    </div>
                    <p className="text-[11px] text-stone-400">
                      Firebase Firestore Cloud Sync • Auto-guardado en tiempo real
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end gap-2">
                    <button
                      type="button"
                      onClick={handleTestCloudConnection}
                      disabled={isTestingConnection}
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                    >
                      <Activity size={13} className={isTestingConnection ? "animate-spin text-amber-400" : "text-emerald-400"} />
                      <span>{isTestingConnection ? "Probando..." : "Probar Conexión"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSyncClick}
                      disabled={syncStatus.isSyncing}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 ${
                        justSynced
                          ? "bg-emerald-500 text-stone-950 font-black"
                          : "bg-amber-500 hover:bg-amber-400 text-stone-950"
                      }`}
                    >
                      <RefreshCw size={13} className={syncStatus.isSyncing ? "animate-spin" : ""} />
                      <span>{justSynced ? "¡Listo!" : "Sincronizar"}</span>
                    </button>
                  </div>
                </div>

                {/* Connection Test Diagnostics Result */}
                {connectionTestResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                      connectionTestResult.success
                        ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                        : "bg-rose-950/40 border-rose-500/40 text-rose-200"
                    }`}
                  >
                    {connectionTestResult.success ? (
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <div className="font-bold flex items-center gap-2">
                        <span>{connectionTestResult.message}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 font-mono">
                          {connectionTestResult.latencyMs}ms
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-300">
                        Base de datos Firestore sincronizada con la nube de Google Cloud.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION: 6-DIGIT DEVICE PAIRING PIN (VINCULACIÓN RÁPIDA CELULAR ↔ COMPUTADORA) */}
              <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold">
                      <KeyRound size={16} />
                    </span>
                    <div>
                      <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                        Vincular Celular con Código PIN (6 Dígitos)
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Conecta tu iPhone 16 Pro Max al instante sin escribir contraseñas ni URLs largas.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Generate PIN Box */}
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/70 space-y-2">
                    <div className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                      1. Generar código en este dispositivo:
                    </div>
                    {pairingPinCode ? (
                      <div className="text-center space-y-1 py-1">
                        <div className="font-mono text-2xl font-black tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 py-2 rounded-xl border border-amber-300 dark:border-amber-800 select-all">
                          {pairingPinCode}
                        </div>
                        <span className="text-[10px] text-stone-400">
                          Válido por 15 minutos • Ingrésalo en tu otro dispositivo
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGeneratePin}
                        disabled={isGeneratingPin}
                        className="w-full py-2 px-3 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-98"
                      >
                        {isGeneratingPin ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                        <span>Generar Código PIN</span>
                      </button>
                    )}
                  </div>

                  {/* Enter PIN Form */}
                  <form
                    onSubmit={handleVerifyPin}
                    className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/70 space-y-2"
                  >
                    <div className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                      2. O ingresa el PIN del otro equipo:
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ej. 492-817"
                        maxLength={7}
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-xs font-mono font-bold text-center tracking-widest text-stone-900 dark:text-stone-100 uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="submit"
                        disabled={isVerifyingPin || !pinInput.trim()}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 disabled:opacity-50 transition-transform active:scale-98"
                      >
                        {isVerifyingPin ? <RefreshCw size={13} className="animate-spin" /> : "Vincular"}
                      </button>
                    </div>
                  </form>
                </div>

                {pinFeedback && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                      pinFeedback.success
                        ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
                    }`}
                  >
                    {pinFeedback.success ? <Check size={14} /> : <AlertTriangle size={14} />}
                    <span className="font-semibold">{pinFeedback.message}</span>
                  </div>
                )}
              </div>

              {/* SECTION: CONECTAR POR CORREO DIRECTO */}
              <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
                      <Mail size={16} />
                    </span>
                    <div>
                      <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                        Vincular Cuenta de Correo
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Todos tus dispositivos con este correo sincronizan el mismo Ledger en tiempo real.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveEmail} className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="usuario@gmail.com"
                    value={emailInputValue}
                    onChange={(e) => setEmailInputValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shrink-0 transition-transform active:scale-95 shadow-xs"
                  >
                    {emailUpdatedFeedback ? "¡Guardado!" : "Vincular"}
                  </button>
                </form>

                {/* QR Code toggle */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowQrPreview(!showQrPreview)}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5"
                  >
                    <QrCode size={14} />
                    <span>{showQrPreview ? "Ocultar Código QR" : "Ver Código QR para escanear en iPhone"}</span>
                  </button>

                  {showQrPreview && (
                    <div className="mt-3 p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 flex flex-col items-center justify-center space-y-2 animate-in fade-in">
                      {qrCodeDataUrl ? (
                        <img
                          src={qrCodeDataUrl}
                          alt="Código QR de vinculación"
                          className="w-44 h-44 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm"
                        />
                      ) : (
                        <RefreshCw size={24} className="animate-spin text-stone-400" />
                      )}
                      <p className="text-[11px] text-stone-500 text-center max-w-xs">
                        Apunta la cámara de tu iPhone 16 Pro Max para abrir Task-OS conectado directamente a{" "}
                        <strong>{syncStatus.email || "tu cuenta"}</strong>.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION: GEMINI MCP SCREENSHOT GUIDANCE & TEST */}
              <div className="p-4 rounded-2xl border-2 border-amber-400 dark:border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 space-y-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500 text-stone-950 font-black">
                      <Sparkles size={16} />
                    </span>
                    <div>
                      <h4 className="font-bold text-stone-950 dark:text-stone-100 text-sm">
                        Conéctate a un servidor de MCP en Google Gemini
                      </h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Solución al error «Esta URL no parece corresponder a un servidor válido»
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestMcpServer}
                    disabled={isTestingMcp}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-700 text-stone-800 dark:text-stone-200 text-[11px] font-bold flex items-center gap-1 shadow-xs"
                  >
                    <Activity size={12} className={isTestingMcp ? "animate-spin text-amber-500" : "text-emerald-500"} />
                    <span>{isTestingMcp ? "Validando..." : "Probar Servidor MCP"}</span>
                  </button>
                </div>

                {mcpTestResult && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                      mcpTestResult.success
                        ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200"
                        : "bg-rose-100 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200"
                    }`}
                  >
                    {mcpTestResult.success ? <Check size={14} /> : <AlertTriangle size={14} />}
                    <span className="font-semibold">{mcpTestResult.message}</span>
                  </div>
                )}

                <div className="text-[11px] text-stone-700 dark:text-stone-300 leading-relaxed bg-white/80 dark:bg-stone-900/80 p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-2">
                  <p>
                    <strong>¿Por qué falló en tu pantalla?</strong> Se ingresó la URL base sin el sufijo oficial del protocolo (<code>/sse</code> o <code>/mcp</code>).
                  </p>
                  <p>
                    Copia la <strong>URL completa con SSE</strong> y pégala en Gemini:
                  </p>
                </div>

                {/* URL Option 1: /sse */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                      <span>URL Oficial Recomendada (con SSE):</span>
                    </div>
                    <div className="font-mono text-xs text-stone-900 dark:text-stone-100 truncate select-all">
                      {sseUrl}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySse}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs shrink-0 transition-transform active:scale-95 min-h-[38px]"
                  >
                    {copiedSse ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedSse ? "¡Copiada!" : "Copiar /sse"}</span>
                  </button>
                </div>

                {/* URL Option 2: /mcp */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                      <span>Ruta directa alternativa /mcp:</span>
                    </div>
                    <div className="font-mono text-xs text-stone-900 dark:text-stone-100 truncate select-all">
                      {mcpUrl}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyMcp}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs shrink-0 transition-transform active:scale-95 min-h-[38px]"
                  >
                    {copiedMcp ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedMcp ? "¡Copiada!" : "Copiar /mcp"}</span>
                  </button>
                </div>
              </div>

              {/* OTHER CONNECTIONS & BACKUPS */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-1">
                  Otras Formas de Conectar y Respaldar:
                </div>

                {/* Google Workspace */}
                <div
                  onClick={() => handleAction(onOpenGoogleWorkspace)}
                  className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-amber-400 dark:hover:border-amber-500 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-blue-500 p-0.5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <div className="w-full h-full bg-white dark:bg-stone-900 rounded-[9px] flex items-center justify-center text-xs font-black text-amber-500">
                        G
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                        Google Workspace & Cloud Hub
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        Sincronización con Google Contacts, Google Tasks, Calendar y Google Sheets.
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-stone-400 group-hover:text-amber-500 shrink-0" />
                </div>

                {/* QR Modal Detail */}
                <div
                  onClick={() => handleAction(onOpenQRAndCloudSync)}
                  className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-amber-400 dark:hover:border-amber-500 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Flame size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                        Firebase Auth & Configuración Completa
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        Acceso con Apple ID, Google, Email o SMS y configuración avanzada.
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-stone-400 group-hover:text-amber-500 shrink-0" />
                </div>

                {/* Export / Import JSON */}
                <div
                  onClick={() => handleAction(onOpenExportImport)}
                  className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-amber-400 dark:hover:border-amber-500 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Download size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                        Respaldo Offline (JSON Snapshot)
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        Descarga una copia completa o restaura datos desde un archivo.
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-stone-400 group-hover:text-amber-500 shrink-0" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONFIGURACIÓN DE SINCRONIZADO AUTOMÁTICO */}
          {activeTab === "autosync" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Auto-Sync Main Control Banner */}
              <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        autoSyncEnabled ? "bg-emerald-500/15 text-emerald-500" : "bg-stone-200 text-stone-500"
                      }`}
                    >
                      <RefreshCw
                        size={18}
                        className={autoSyncEnabled ? "animate-spin" : ""}
                        style={{ animationDuration: "6s" }}
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                        Sincronización Automática en la Nube
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        {autoSyncEnabled ? "Activa y sincronizando en segundo plano" : "Pausada temporalmente"}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => onToggleAutoSync && onToggleAutoSync(!autoSyncEnabled)}
                    className={`w-12 h-7 rounded-full transition-colors relative flex items-center px-1 ${
                      autoSyncEnabled ? "bg-emerald-500" : "bg-stone-300 dark:bg-stone-700"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                        autoSyncEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Status Indicator Bar */}
                <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        autoSyncEnabled ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
                      }`}
                    />
                    <span>
                      Próximo auto-sync: <strong>{autoSyncEnabled ? `${secondsUntilSync}s` : "Pausado"}</strong>
                    </span>
                  </span>

                  <span className="text-stone-400">
                    Último sync: {lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>

                {/* Progress bar */}
                {autoSyncEnabled && (
                  <div className="w-full bg-stone-200 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full transition-all duration-1000 ease-linear"
                      style={{
                        width: `${Math.max(0, Math.min(100, ((autoSyncInterval - secondsUntilSync) / autoSyncInterval) * 100))}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Interval frequency options */}
              <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="font-bold text-stone-900 dark:text-stone-100 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-500" />
                  <span>Frecuencia de Sincronizado Automático</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "10 Segundos", val: 10, note: "En Tiempo Real" },
                    { label: "30 Segundos", val: 30, recommended: true, note: "Recomendado" },
                    { label: "1 Minuto", val: 60, note: "Estándar" },
                    { label: "5 Minutos", val: 300, note: "Bajo Consumo" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => onChangeAutoSyncInterval && onChangeAutoSyncInterval(opt.val)}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                        autoSyncInterval === opt.val
                          ? "bg-amber-500 text-stone-950 border-amber-500 shadow-xs"
                          : "border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-amber-400 bg-white dark:bg-stone-900"
                      }`}
                    >
                      <div>{opt.label}</div>
                      <div className="text-[9px] uppercase font-bold opacity-80 mt-0.5">
                        {opt.note}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-sync triggers checklist */}
              <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2.5 text-xs text-stone-700 dark:text-stone-300">
                <div className="font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider text-[11px] mb-1">
                  Disparadores Inteligentes Activos:
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span>Sincronizar en segundo plano periódicamente (cada {autoSyncInterval}s)</span>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span>Sincronizar automáticamente al volver a la pestaña o reactivar el iPhone</span>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span>Sincronizar reactivamente 1.5s después de editar o completar una tarea</span>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span>Sincronizar al reconectarse a internet tras pérdida de conexión</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSyncClick}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-98 min-h-[44px]"
                >
                  <RefreshCw size={15} className={syncStatus.isSyncing ? "animate-spin" : ""} />
                  <span>Forzar Sincronización Manual Ahora</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CONFIGURACIÓN DE NOTIFICACIONES */}
          {activeTab === "notifications" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Permission Banner */}
              <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        permissionStatus === "granted"
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-rose-500/15 text-rose-500"
                      }`}
                    >
                      <BellRing size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                        Permiso de Notificaciones del Sistema
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        {permissionStatus === "granted"
                          ? "Permiso concedido en este dispositivo"
                          : "Permiso pendiente de autorización"}
                      </p>
                    </div>
                  </div>

                  {permissionStatus === "granted" ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                      <Check size={12} /> Concedido
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestPermission}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs"
                    >
                      Habilitar
                    </button>
                  )}
                </div>

                {permissionStatus !== "granted" && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
                    Toca en <strong>"Habilitar"</strong> y luego en <strong>"Permitir"</strong> cuando el navegador te lo solicite para recibir avisos de cierre de tareas y alertas en tu iPhone 16 Pro Max o computadora.
                  </p>
                )}
              </div>

              {/* Notification Categories Switches */}
              <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="font-bold text-stone-900 dark:text-stone-100 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={14} className="text-amber-500" />
                  <span>Alertas y Tipos de Notificación</span>
                </div>

                <div className="space-y-3">
                  {/* Task completed notification */}
                  <label className="flex items-center justify-between cursor-pointer gap-2">
                    <div>
                      <div className="font-bold text-stone-900 dark:text-stone-100 text-xs">
                        Avisos al completar tareas (Ley 15)
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Notificación visual y sonora al marcar una tarea como terminada.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifConfig.taskCompleted}
                      onChange={(e) => onUpdateNotifConfig && onUpdateNotifConfig({ taskCompleted: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />
                  </label>

                  {/* Pomodoro ended notification */}
                  <label className="flex items-center justify-between cursor-pointer gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <div>
                      <div className="font-bold text-stone-900 dark:text-stone-100 text-xs">
                        Alarma al concluir ciclo Pomodoro (Ley 27)
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Alerta sonora y notificación al finalizar los 25 minutos de enfoque.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifConfig.pomodoroEnded}
                      onChange={(e) => onUpdateNotifConfig && onUpdateNotifConfig({ pomodoroEnded: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />
                  </label>

                  {/* New solicitudes from clients */}
                  <label className="flex items-center justify-between cursor-pointer gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <div>
                      <div className="font-bold text-stone-900 dark:text-stone-100 text-xs">
                        Nuevas solicitudes de clientes (WhatsApp / Web)
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Aviso instantáneo cuando ingrese un mensaje o pedido al buzón.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifConfig.newSolicitudes}
                      onChange={(e) => onUpdateNotifConfig && onUpdateNotifConfig({ newSolicitudes: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />
                  </label>

                  {/* Urgent reminders */}
                  <label className="flex items-center justify-between cursor-pointer gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <div>
                      <div className="font-bold text-stone-900 dark:text-stone-100 text-xs">
                        Recordatorios de Tareas Urgentes y del Día
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Avisos de tareas con vencimiento hoy o marcadas como Esenciales.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifConfig.urgentReminders ?? true}
                      onChange={(e) => onUpdateNotifConfig && onUpdateNotifConfig({ urgentReminders: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />
                  </label>

                  {/* Sound chimes */}
                  <label className="flex items-center justify-between cursor-pointer gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <div>
                      <div className="font-bold text-stone-900 dark:text-stone-100 text-xs flex items-center gap-1.5">
                        <Volume2 size={13} className="text-amber-500" />
                        <span>Efectos de sonido audibles (Chimes)</span>
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Reproducir campanadas y sonidos de confirmación en la app.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifConfig.soundChimes}
                      onChange={(e) => {
                        const val = e.target.checked;
                        if (typeof window !== "undefined") {
                          localStorage.setItem("taskos_sound_muted", val ? "false" : "true");
                        }
                        if (onUpdateNotifConfig) onUpdateNotifConfig({ soundChimes: val });
                      }}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />
                  </label>

                  {/* Focus do not disturb */}
                  <label className="flex items-center justify-between cursor-pointer gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <div>
                      <div className="font-bold text-stone-900 dark:text-stone-100 text-xs flex items-center gap-1.5">
                        <VolumeX size={13} className="text-stone-400" />
                        <span>Modo Enfoque / No Molestar (Focus DND)</span>
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Silenciar notificaciones no urgentes mientras esté corriendo el Pomodoro.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifConfig.focusDoNotDisturb}
                      onChange={(e) => onUpdateNotifConfig && onUpdateNotifConfig({ focusDoNotDisturb: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />
                  </label>
                </div>
              </div>

              {/* Sound Customization: Tone and Volume */}
              {notifConfig.soundChimes && (
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
                  <div className="font-bold text-stone-900 dark:text-stone-100 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 size={14} className="text-amber-500" />
                    <span>Personalización del Tono Sonoro</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "bell", label: "Campana Doble" },
                      { id: "zen", label: "Tono Zen Relajante" },
                      { id: "work_done", label: "Chime Ejecutivo" },
                      { id: "urgent", label: "Alerta Urgente" },
                    ].map((tone) => (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => handleSoundSample(tone.id as ChimeType)}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 min-h-[50px] ${
                          (notifConfig.soundType || "bell") === tone.id
                            ? "bg-amber-500 text-stone-950 border-amber-500 shadow-xs"
                            : "border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-amber-400 bg-white dark:bg-stone-900"
                        }`}
                      >
                        <span>{tone.label}</span>
                        <span className="text-[10px] opacity-75">▶ Escuchar</span>
                      </button>
                    ))}
                  </div>

                  {/* Volume Slider */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      <span>Volumen de campanadas:</span>
                      <span>{Math.round((notifConfig.soundVolume ?? 0.8) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={notifConfig.soundVolume ?? 0.8}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (onUpdateNotifConfig) onUpdateNotifConfig({ soundVolume: val });
                      }}
                      className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Test Notification Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-98 min-h-[44px]"
                >
                  <Bell size={15} className={testNotifSent ? "animate-bounce" : ""} />
                  <span>{testNotifSent ? "¡Notificación de Prueba Despachada!" : "Enviar Notificación y Sonido de Prueba Ahora"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick shortcuts to secondary workspaces */}
          <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-1">
              Accesos Directos a Módulos:
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleAction(() => onNavigateToWorkspace && onNavigateToWorkspace("urls"))
                }
                className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <Bookmark size={15} className="text-amber-500 shrink-0" />
                <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                  Biblioteca URLs
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleAction(() => onNavigateToWorkspace && onNavigateToWorkspace("print"))
                }
                className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <Printer size={15} className="text-blue-500 shrink-0" />
                <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                  Print Station
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleAction(() => onNavigateToWorkspace && onNavigateToWorkspace("analytics"))
                }
                className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <TrendingUp size={15} className="text-emerald-500 shrink-0" />
                <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                  Rendimiento 📊
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleAction(onOpenContacts)}
                className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <Users size={15} className="text-indigo-500 shrink-0" />
                <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                  Contactos
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleAction(onOpenTags)}
                className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <TagIcon size={15} className="text-pink-500 shrink-0" />
                <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                  Etiquetas
                </span>
              </button>

              {onResetLedger && (
                <button
                  type="button"
                  onClick={() => handleAction(onResetLedger)}
                  className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors flex items-center gap-2 min-h-[44px] text-stone-500"
                >
                  <RotateCcw size={15} className="shrink-0" />
                  <span className="font-semibold truncate">Reiniciar Ledger</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-stone-100 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 px-4 sm:px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <span className="flex items-center gap-1.5">
            <Smartphone size={13} className="text-amber-500" />
            Optimizado para iPhone 16 Pro Max y Google Gemini
          </span>
          <span className="font-mono text-stone-400">
            {autoSyncEnabled ? `Auto-sync: cada ${autoSyncInterval}s` : "Auto-sync: Pausado"}
          </span>
        </div>
      </div>
    </div>
  );
}
