import React, { useState } from "react";
import {
  Printer,
  FileText,
  Download,
  Share2,
  Copy,
  Check,
  Send,
  Mail,
  DollarSign,
  Plus,
  RefreshCw,
  Trash2,
  Eye,
  CreditCard,
  Calendar,
  Phone,
  User,
  ExternalLink,
  Sparkles,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { PrintItem, PrintDocType, LonasOrder, ExpectedIncome } from "../types";
import { formatReceiptText, downloadReceiptPNG, generateReceiptPNG } from "../utils/receiptGenerator";
import { playChime } from "../utils/audio";

interface PrintOSProps {
  currentPrintItem?: PrintItem | null;
  lonasOrders?: LonasOrder[];
  onSaveToFinanzas?: (income: Partial<ExpectedIncome>) => void;
  onSaveToLonas?: (order: Partial<LonasOrder>) => void;
  onSwitchWorkspace?: (ws: "task-os" | "lonas" | "finanzas" | "urls" | "print" | "pomodoro") => void;
}

const STORAGE_KEY_PRINT_QUEUE = "task_os_print_queue_v1";

const DEFAULT_PRINT_ITEMS: PrintItem[] = [
  {
    id: "print-l008",
    tipo: "ticket_lona",
    folio: "L-008",
    titulo: "El Taller del Maestro • Zona Jaguar",
    clienteNombre: "El Taller del Maestro",
    clienteTelefono: "5219999011852",
    clienteEmail: "tallerdelmaestro@ejemplo.com",
    empresaZona: "Zona Jaguar",
    fecha: "2026-09-12",
    fechaEntrega: "12 sep 2026",
    items: [
      {
        descripcion: "fachada",
        detalle: "4 m x 0.5 m • 2.00 m²",
        cantidad: 1,
        subtotal: 220.0,
      },
    ],
    total: 220.0,
    anticipo: 0.0,
    saldo: 220.0,
    metodoPago: "Efectivo / Transferencia",
    estado: "Cotización",
    notas: "Contacto: M. Máxima • Costo de prod: $130.00 • Utilidad estimada: $90.00",
    origen: "lonas",
    driveUrl: "https://drive.google.com/file/d/1taller-maestro-diseno-fachada-lonas/view",
    createdAt: new Date().toISOString(),
  },
  {
    id: "print-l005",
    tipo: "ticket_lona",
    folio: "L-005",
    titulo: "LA LEGIÓN - AZUL • Zona Jaguar",
    clienteNombre: "LA LEGIÓN - AZUL",
    clienteTelefono: "5219991234567",
    empresaZona: "Zona Jaguar",
    fecha: "2026-09-07",
    fechaEntrega: "7 sep 2026",
    items: [
      {
        descripcion: "Lona Gran Formato Bastilla",
        detalle: "3.5 m x 2.0 m • 7.00 m²",
        cantidad: 1,
        subtotal: 850.0,
      },
    ],
    total: 850.0,
    anticipo: 850.0,
    saldo: 0.0,
    metodoPago: "Transferencia Bancaria",
    estado: "Listo",
    notas: "Totalmente pagado. Entregar con tubo de protección.",
    origen: "lonas",
    driveUrl: "https://drive.google.com/file/d/1la-legion-azul-diseno-banner/view",
    createdAt: new Date().toISOString(),
  },
  {
    id: "print-recibo-molas",
    tipo: "comprobante_pago",
    folio: "REC-204",
    titulo: "Pago Confirmado • MOLAS",
    clienteNombre: "MOLAS",
    clienteTelefono: "5215512345678",
    fecha: "2026-09-11",
    items: [
      {
        descripcion: "Abono a cuenta comercial / Lonas",
        detalle: "Ingreso recibido vía transferencia BBVA",
        cantidad: 1,
        subtotal: 6000.0,
      },
    ],
    total: 6000.0,
    anticipo: 6000.0,
    saldo: 0.0,
    metodoPago: "Transferencia BBVA",
    estado: "Confirmado",
    notas: "Ingreso programado aplicado a Salud Financiera.",
    origen: "finanzas",
    createdAt: new Date().toISOString(),
  },
];

export default function PrintOS({
  currentPrintItem,
  lonasOrders = [],
  onSaveToFinanzas,
  onSaveToLonas,
  onSwitchWorkspace,
}: PrintOSProps) {
  const [queue, setQueue] = useState<PrintItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRINT_QUEUE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_PRINT_ITEMS;
  });

  const [selectedId, setSelectedId] = useState<string>(() => {
    if (currentPrintItem?.id) return currentPrintItem.id;
    return DEFAULT_PRINT_ITEMS[0].id;
  });

  const [copiedText, setCopiedText] = useState(false);
  const [isGeneratingPNG, setIsGeneratingPNG] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Sync external incoming item to queue
  React.useEffect(() => {
    if (currentPrintItem) {
      setQueue((prev) => {
        const exists = prev.some((p) => p.id === currentPrintItem.id);
        if (exists) {
          return prev.map((p) => (p.id === currentPrintItem.id ? currentPrintItem : p));
        }
        return [currentPrintItem, ...prev];
      });
      setSelectedId(currentPrintItem.id);
    }
  }, [currentPrintItem]);

  // Persist queue
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRINT_QUEUE, JSON.stringify(queue));
    } catch (_) {}
  }, [queue]);

  const activeItem = queue.find((q) => q.id === selectedId) || queue[0] || DEFAULT_PRINT_ITEMS[0];

  const handleCopyText = async () => {
    const text = formatReceiptText(activeItem);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      playChime("tick");
      setActionFeedback("¡Texto del comprobante copiado al portapapeles!");
      setTimeout(() => {
        setCopiedText(false);
        setActionFeedback(null);
      }, 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadPNG = async () => {
    setIsGeneratingPNG(true);
    try {
      await downloadReceiptPNG(activeItem);
      playChime("success");
      setActionFeedback("¡Comprobante PNG descargado exitosamente!");
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (e) {
      console.error("Failed PNG generation", e);
    } finally {
      setIsGeneratingPNG(false);
    }
  };

  const handleSendWhatsApp = () => {
    const text = formatReceiptText(activeItem);
    const phone = (activeItem.clienteTelefono || "").replace(/[^0-9]/g, "");
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    playChime("work_done");
  };

  const handleSendEmail = () => {
    const text = formatReceiptText(activeItem);
    const subject = encodeURIComponent(`Comprobante ${activeItem.folio || "Digital"} - ${activeItem.titulo}`);
    const body = encodeURIComponent(text);
    const email = activeItem.clienteEmail || "";
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
    playChime("work_done");
  };

  const handlePhysicalPrint = () => {
    window.print();
  };

  const handleSaveFinanzas = () => {
    if (onSaveToFinanzas) {
      onSaveToFinanzas({
        concepto: `Comprobante ${activeItem.folio || ""}: ${activeItem.titulo}`,
        montoEsperado: activeItem.total,
        montoRecibido: activeItem.anticipo || activeItem.total,
        fechaEsperada: activeItem.fecha,
        estado: activeItem.saldo && activeItem.saldo > 0 ? "Parcial" : "Recibido",
        categoria: "Ventas Lonas / Servicios",
      });
      playChime("success");
      setActionFeedback("Guardado como ingreso en Salud Financiera 🤑");
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  const handleSaveLonas = () => {
    if (onSaveToLonas) {
      onSaveToLonas({
        id: `lon-${Date.now()}`,
        folio: Number((activeItem.folio || "").replace(/\D/g, "")) || 108,
        cliente: {
          nombre: activeItem.clienteNombre,
          telefono: activeItem.clienteTelefono || "",
          empresa: activeItem.empresaZona,
          email: activeItem.clienteEmail,
        },
        total: activeItem.total,
        anticipo: activeItem.anticipo || 0,
        saldo: activeItem.saldo || 0,
        estado: (activeItem.estado as any) || "Cotización",
        fechaIngreso: activeItem.fecha,
        fechaEntregaEstimada: activeItem.fechaEntrega || activeItem.fecha,
      });
      playChime("success");
      setActionFeedback("Vinculado exitosamente con Pedidos de Lonas 💻");
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  const handleCreateNewManual = () => {
    const newItem: PrintItem = {
      id: `print-${Date.now()}`,
      tipo: "recibo_general",
      folio: `T-${Math.floor(100 + Math.random() * 900)}`,
      titulo: "Servicio de Impresión / Trabajo General",
      clienteNombre: "Cliente Nuevo",
      clienteTelefono: "",
      fecha: new Date().toISOString().slice(0, 10),
      items: [
        {
          descripcion: "Trabajo de producción / impresión",
          detalle: "Especificaciones generales",
          cantidad: 1,
          subtotal: 500.0,
        },
      ],
      total: 500.0,
      anticipo: 250.0,
      saldo: 250.0,
      metodoPago: "Efectivo",
      estado: "En proceso",
      createdAt: new Date().toISOString(),
    };
    setQueue([newItem, ...queue]);
    setSelectedId(newItem.id);
    playChime("tick");
  };

  const handleDeleteItem = (id: string) => {
    if (queue.length <= 1) return;
    const remaining = queue.filter((q) => q.id !== id);
    setQueue(remaining);
    setSelectedId(remaining[0].id);
  };

  return (
    <div id="print-os-workspace" className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-2xl shadow-md shadow-amber-500/20">
            🖨️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                Módulo Digital
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-stone-950 dark:text-white tracking-tight">
                PRINT OS
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
              Comprobantes digitales en texto y PNG • WhatsApp, correo, impresión térmica y sincronización
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateNewManual}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-bold text-xs hover:bg-stone-800 transition-all shadow-sm active:scale-95"
          >
            <Plus size={15} />
            <span>Nuevo Comprobante</span>
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 font-semibold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-emerald-700 dark:text-emerald-300 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Main Split: Queue list & Live Voucher Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Comprobantes Queue & Editor (4 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Cola de Documentos ({queue.length})
              </h3>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                Activo: {activeItem.folio || activeItem.id}
              </span>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {queue.map((item) => {
                const isSelected = item.id === selectedId;
                const isPaid = item.saldo !== undefined ? item.saldo <= 0 : false;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedId(item.id);
                      playChime("tick");
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 dark:border-amber-500/80 shadow-xs"
                        : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-900"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-amber-600 dark:text-amber-400">
                          {item.folio || "DOC"}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {isPaid ? "Pagado" : `Saldo $${item.saldo}`}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate mt-0.5">
                        {item.clienteNombre}
                      </p>
                      <p className="text-[10px] text-stone-400 truncate font-mono">
                        {item.titulo} • ${item.total}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {queue.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(item.id);
                          }}
                          className="p-1 rounded-lg text-stone-300 hover:text-rose-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                          title="Eliminar de la cola"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Edit of Active Document */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Detalles del Comprobante
            </h4>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase">Cliente / Destinatario</label>
                <input
                  type="text"
                  value={activeItem.clienteNombre}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQueue((prev) =>
                      prev.map((q) => (q.id === activeItem.id ? { ...q, clienteNombre: val } : q))
                    );
                  }}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase">Folio</label>
                  <input
                    type="text"
                    value={activeItem.folio || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQueue((prev) =>
                        prev.map((q) => (q.id === activeItem.id ? { ...q, folio: val } : q))
                      );
                    }}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase">Teléfono WhatsApp</label>
                  <input
                    type="text"
                    value={activeItem.clienteTelefono || ""}
                    placeholder="521999..."
                    onChange={(e) => {
                      const val = e.target.value;
                      setQueue((prev) =>
                        prev.map((q) => (q.id === activeItem.id ? { ...q, clienteTelefono: val } : q))
                      );
                    }}
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase">Total ($)</label>
                  <input
                    type="number"
                    value={activeItem.total}
                    onChange={(e) => {
                      const totalVal = Number(e.target.value) || 0;
                      const antVal = activeItem.anticipo || 0;
                      setQueue((prev) =>
                        prev.map((q) =>
                          q.id === activeItem.id
                            ? { ...q, total: totalVal, saldo: Math.max(0, totalVal - antVal) }
                            : q
                        )
                      );
                    }}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase">Anticipo ($)</label>
                  <input
                    type="number"
                    value={activeItem.anticipo || 0}
                    onChange={(e) => {
                      const antVal = Number(e.target.value) || 0;
                      const totalVal = activeItem.total || 0;
                      setQueue((prev) =>
                        prev.map((q) =>
                          q.id === activeItem.id
                            ? { ...q, anticipo: antVal, saldo: Math.max(0, totalVal - antVal) }
                            : q
                        )
                      );
                    }}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase">Saldo ($)</label>
                  <input
                    type="number"
                    value={activeItem.saldo || 0}
                    disabled
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 text-amber-600 dark:text-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase">Notas / Observaciones</label>
                <input
                  type="text"
                  value={activeItem.notas || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQueue((prev) =>
                      prev.map((q) => (q.id === activeItem.id ? { ...q, notas: val } : q))
                    );
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase flex items-center justify-between">
                  <span>📁 Link de Google Drive (Diseño)</span>
                  <span className="text-amber-500 font-normal">Todo Vinculado</span>
                </label>
                <input
                  type="url"
                  value={activeItem.driveUrl || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQueue((prev) =>
                      prev.map((q) => (q.id === activeItem.id ? { ...q, driveUrl: val } : q))
                    );
                  }}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live High-Resolution Thermal Ticket Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Action Buttons Toolbar */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-4 shadow-sm">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
              Acciones de Entrega y Guardado
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* WhatsApp Action */}
              <button
                onClick={handleSendWhatsApp}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
                title="Mandar comprobante por WhatsApp"
              >
                <Send size={14} />
                <span>WhatsApp</span>
              </button>

              {/* PNG Download */}
              <button
                onClick={handleDownloadPNG}
                disabled={isGeneratingPNG}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-sm transition-all active:scale-95"
                title="Descargar ticket en formato imagen PNG"
              >
                <Download size={14} />
                <span>Ticket PNG</span>
              </button>

              {/* Copy Text */}
              <button
                onClick={handleCopyText}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs transition-all active:scale-95"
                title="Copiar texto estructurado"
              >
                {copiedText ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copiedText ? "¡Copiado!" : "Copiar Texto"}</span>
              </button>

              {/* Email */}
              <button
                onClick={handleSendEmail}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs transition-all active:scale-95"
                title="Enviar por correo electrónico"
              >
                <Mail size={14} />
                <span>Por Correo</span>
              </button>
            </div>

            {/* Cross-tool integration buttons: Save to Finanzas or Lonas */}
            <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveFinanzas}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 font-bold text-xs hover:bg-emerald-100 transition-colors"
                  title="Registrar en Salud Financiera"
                >
                  <span>🤑 Guardar en Finanzas</span>
                </button>

                <button
                  onClick={handleSaveLonas}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 font-bold text-xs hover:bg-amber-100 transition-colors"
                  title="Guardar o vincular en Pedidos de Lonas"
                >
                  <span>💻 Guardar en Lonas</span>
                </button>
              </div>

              <button
                onClick={handlePhysicalPrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-bold text-xs hover:bg-stone-800 transition-all shadow-xs"
                title="Imprimir ticket en impresora física"
              >
                <Printer size={13} />
                <span>Imprimir 🖨️</span>
              </button>
            </div>
          </div>

          {/* Visual Digital Voucher (Receipt Card Preview) */}
          <div className="max-w-md mx-auto bg-white dark:bg-stone-900 border-2 border-stone-300 dark:border-stone-700 rounded-3xl p-6 shadow-xl relative overflow-hidden font-sans">
            {/* Top decorative tear bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-stone-900 to-amber-500" />

            {/* Header */}
            <div className="text-center pb-4 border-b border-dashed border-stone-300 dark:border-stone-700">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                Taller de Producción & Soluciones
              </span>
              <h3 className="text-lg font-black text-stone-950 dark:text-white uppercase tracking-tight mt-0.5">
                Comprobante Digital
              </h3>
              <div className="flex items-center justify-center gap-2 mt-1 font-mono text-xs text-stone-500 dark:text-stone-400">
                <span className="font-bold text-stone-800 dark:text-stone-200">FOLIO: {activeItem.folio || "L-008"}</span>
                <span>•</span>
                <span>{activeItem.fecha}</span>
              </div>
            </div>

            {/* Client Block */}
            <div className="py-3.5 border-b border-dashed border-stone-300 dark:border-stone-700 space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-stone-400">
                Cliente / Destinatario
              </span>
              <h4 className="text-sm font-black text-stone-900 dark:text-stone-100">
                {activeItem.clienteNombre}
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                {activeItem.empresaZona && (
                  <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 font-medium">
                    📍 {activeItem.empresaZona}
                  </span>
                )}
                {activeItem.clienteTelefono && (
                  <span className="font-mono text-[10px]">
                    📞 {activeItem.clienteTelefono}
                  </span>
                )}
              </div>
            </div>

            {/* Items Breakdown */}
            <div className="py-3.5 border-b border-dashed border-stone-300 dark:border-stone-700 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-stone-400">
                <span>Concepto / Trabajo</span>
                <span>Subtotal</span>
              </div>

              {activeItem.items && activeItem.items.length > 0 ? (
                activeItem.items.map((it, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2 text-xs">
                    <div>
                      <p className="font-bold text-stone-900 dark:text-stone-100">
                        {it.cantidad ? `${it.cantidad}x ` : ""}
                        {it.descripcion}
                      </p>
                      {it.detalle && (
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                          {it.detalle}
                        </p>
                      )}
                    </div>
                    <span className="font-mono font-bold text-stone-900 dark:text-stone-100 shrink-0">
                      ${it.subtotal ? it.subtotal.toFixed(2) : "0.00"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{activeItem.titulo}</span>
                  <span className="font-mono">${activeItem.total.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="py-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
                <span>Precio al cliente:</span>
                <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                  ${activeItem.total.toFixed(2)}
                </span>
              </div>

              {typeof activeItem.anticipo === "number" && activeItem.anticipo > 0 && (
                <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
                  <span>Anticipo recibido:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    -${activeItem.anticipo.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Saldo Highlight Box */}
              <div
                className={`p-3 rounded-2xl border flex items-center justify-between mt-2 ${
                  activeItem.saldo && activeItem.saldo > 0
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200"
                    : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200"
                }`}
              >
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider block">
                    {activeItem.saldo && activeItem.saldo > 0 ? "Saldo por cobrar" : "Estado del Pedido"}
                  </span>
                  <span className="text-xs font-bold">
                    {activeItem.saldo && activeItem.saldo > 0 ? "Pendiente a la entrega" : "TOTALMENTE PAGADO"}
                  </span>
                </div>
                <div className="text-right font-mono font-black text-base sm:text-lg">
                  ${(activeItem.saldo !== undefined ? activeItem.saldo : activeItem.total).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Archivo de Diseño en Google Drive (Todo Vinculado) */}
            {activeItem.driveUrl && (
              <div className="my-2.5 p-2.5 rounded-2xl bg-[#eef5ff] dark:bg-[#073d83]/20 border border-[#042f66]/20 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-base shrink-0">📁</span>
                  <div className="truncate">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-[#042f66] dark:text-[#ffd15c]">
                      Archivo de Diseño en Drive
                    </span>
                    <a
                      href={activeItem.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#073d83] dark:text-blue-300 font-mono underline truncate block text-[11px]"
                    >
                      {activeItem.driveUrl}
                    </a>
                  </div>
                </div>
                <a
                  href={activeItem.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-xl bg-[#042f66] text-white hover:bg-[#073d83] text-[10px] font-bold shrink-0 transition-colors"
                >
                  Abrir ↗
                </a>
              </div>
            )}

            {/* Footer notes */}
            {activeItem.notas && (
              <div className="pt-2 pb-1 text-[11px] text-stone-500 dark:text-stone-400 border-t border-stone-100 dark:border-stone-800">
                <p>
                  <strong>Notas:</strong> {activeItem.notas}
                </p>
              </div>
            )}

            {/* Digital Stamp / QR Footer */}
            <div className="mt-4 pt-3 border-t border-dashed border-stone-300 dark:border-stone-700 flex items-center justify-between text-[10px] text-stone-400 font-mono">
              <div className="flex items-center gap-1.5">
                <QrCode size={20} className="text-stone-400" />
                <span>TASK-OS • CONTROL DIGITAL</span>
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck size={12} /> Verificado
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
