import React, { useState, useEffect } from "react";
import {
  Printer,
  Plus,
  Search,
  ExternalLink,
  DollarSign,
  Package,
  Clock,
  CheckCircle2,
  Calendar,
  Phone,
  FileText,
  AlertCircle,
  Truck,
  RotateCcw,
  RefreshCw,
  Send,
  X,
  Share2,
  ArrowRight,
  TrendingUp,
  LayoutGrid,
  List as ListIcon,
  Trash2,
  Download,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { LonasOrder, LonasStatus, LonasOrderItem, Contact, PrintItem, UrlLibraryItem } from "../types";
import { playChime } from "../utils/audio";
import { buildWhatsAppUrl, openWhatsAppInNewTab } from "../utils/whatsapp";
import { downloadReceiptPNG } from "../utils/receiptGenerator";

export const STORAGE_KEY_LONAS = "task_os_pepe_lonas_orders_v1";

export const INITIAL_LONAS_ORDERS: LonasOrder[] = [
  {
    id: "lon-008",
    folio: 8,
    cliente: {
      nombre: "El Taller del Maestro",
      telefono: "5219999011852",
      empresa: "Zona Jaguar",
    },
    items: [
      {
        id: "item-008",
        descripcion: "fachada",
        ancho: 4.0,
        alto: 0.5,
        cantidad: 1,
        m2: 2.0,
        costoPorM2: 65,
        precioVentaPorM2: 110,
        costoCalculado: 130,
        precioCalculado: 220,
        precioFinal: 220,
        costoFinal: 130,
        observaciones: "Contacto: M. Máxima",
      },
    ],
    subtotal: 220,
    descuento: 0,
    total: 220,
    anticipo: 0,
    pagos: [],
    saldo: 220,
    estado: "Cotización",
    fechaIngreso: "2026-09-12",
    fechaEntregaEstimada: "12 sep 2026",
    driveUrl: "https://drive.google.com/file/d/1taller-maestro-diseno-fachada-lonas/view",
    notasInternas: "Seguimiento: Activo. Contacto: M. Máxima.",
    notasCliente: "Cotización pendiente de anticipo.",
  },
  {
    id: "lon-005",
    folio: 5,
    cliente: {
      nombre: "LA LEGIÓN - AZUL",
      telefono: "5219991234567",
      empresa: "Zona Jaguar",
    },
    items: [
      {
        id: "item-005",
        descripcion: "Lona Front con Ojillos reforzados",
        ancho: 3.5,
        alto: 2.0,
        cantidad: 1,
        m2: 7.0,
        costoPorM2: 55,
        precioVentaPorM2: 121.4,
        costoCalculado: 385,
        precioCalculado: 850,
        precioFinal: 850,
        costoFinal: 385,
      },
    ],
    subtotal: 850,
    descuento: 0,
    total: 850,
    anticipo: 850,
    pagos: [
      {
        id: "pay-005",
        fecha: "2026-09-07",
        monto: 850,
        metodo: "Transferencia",
        referencia: "TRANS-771",
      },
    ],
    saldo: 0,
    estado: "Listo",
    fechaIngreso: "2026-09-05",
    fechaEntregaEstimada: "7 sep 2026",
    driveUrl: "https://drive.google.com/file/d/1la-legion-azul-diseno-banner/view",
    notasInternas: "Listo para recoger.",
  },
  {
    id: "lon-007",
    folio: 7,
    cliente: {
      nombre: "Cazadores de Sueños",
      telefono: "5215512345678",
      empresa: "Zona Jaguar",
    },
    items: [
      {
        id: "item-007",
        descripcion: "Vinil mate sobre coroplast",
        ancho: 2.0,
        alto: 1.0,
        cantidad: 1,
        m2: 2.0,
        costoPorM2: 80,
        precioVentaPorM2: 200,
        costoCalculado: 160,
        precioCalculado: 400,
        precioFinal: 400,
        costoFinal: 160,
      },
    ],
    subtotal: 400,
    descuento: 0,
    total: 400,
    anticipo: 400,
    pagos: [
      {
        id: "pay-007",
        fecha: "2026-09-10",
        monto: 400,
        metodo: "Transferencia",
      },
    ],
    saldo: 0,
    estado: "Diseño",
    fechaIngreso: "2026-09-10",
    fechaEntregaEstimada: "12 sep 2026",
  },
  {
    id: "lon-009",
    folio: 9,
    cliente: {
      nombre: "Restaurante Don Pepe",
      telefono: "5219999011852",
      empresa: "Zona Centro",
    },
    items: [
      {
        id: "item-009",
        descripcion: "Lona 13oz Menú Exterior",
        ancho: 3.0,
        alto: 1.5,
        cantidad: 1,
        m2: 4.5,
        costoPorM2: 70,
        precioVentaPorM2: 160,
        costoCalculado: 315,
        precioCalculado: 720,
        precioFinal: 720,
        costoFinal: 315,
      },
    ],
    subtotal: 720,
    descuento: 0,
    total: 720,
    anticipo: 200,
    pagos: [],
    saldo: 520,
    estado: "Producción",
    fechaIngreso: "2026-09-18",
    fechaEntregaEstimada: "22 sep 2026",
  },
  {
    id: "lon-010",
    folio: 10,
    cliente: {
      nombre: "Clínica San Francisco",
      telefono: "5219991234567",
      empresa: "Zona Norte",
    },
    items: [
      {
        id: "item-010",
        descripcion: "Banner Roll-Up 85x200cm",
        ancho: 0.85,
        alto: 2.0,
        cantidad: 2,
        m2: 3.4,
        costoPorM2: 120,
        precioVentaPorM2: 300,
        costoCalculado: 408,
        precioCalculado: 1020,
        precioFinal: 1020,
        costoFinal: 408,
      },
    ],
    subtotal: 1020,
    descuento: 0,
    total: 1020,
    anticipo: 0,
    pagos: [],
    saldo: 1020,
    estado: "Producción",
    fechaIngreso: "2026-09-19",
    fechaEntregaEstimada: "24 sep 2026",
  },
  {
    id: "lon-011",
    folio: 11,
    cliente: {
      nombre: "Evento Cultural Universidad",
      telefono: "5215512345678",
      empresa: "Zona Poniente",
    },
    items: [
      {
        id: "item-011",
        descripcion: "Backlight con bastilla perimetral",
        ancho: 4.0,
        alto: 2.5,
        cantidad: 1,
        m2: 10.0,
        costoPorM2: 110,
        precioVentaPorM2: 280,
        costoCalculado: 1100,
        precioCalculado: 2800,
        precioFinal: 2800,
        costoFinal: 1100,
      },
    ],
    subtotal: 2800,
    descuento: 0,
    total: 2800,
    anticipo: 1000,
    pagos: [],
    saldo: 1800,
    estado: "Diseño",
    fechaIngreso: "2026-09-20",
    fechaEntregaEstimada: "25 sep 2026",
  },
  {
    id: "lon-012",
    folio: 12,
    cliente: {
      nombre: "Farmacia El Progreso",
      telefono: "5219999011852",
      empresa: "Zona Sur",
    },
    items: [
      {
        id: "item-012",
        descripcion: "Rotulación Microperforado",
        ancho: 2.5,
        alto: 1.5,
        cantidad: 1,
        m2: 3.75,
        costoPorM2: 130,
        precioVentaPorM2: 310,
        costoCalculado: 487.5,
        precioCalculado: 1162.5,
        precioFinal: 1160,
        costoFinal: 487.5,
      },
    ],
    subtotal: 1160,
    descuento: 0,
    total: 1160,
    anticipo: 0,
    pagos: [],
    saldo: 1160,
    estado: "Producción",
    fechaIngreso: "2026-09-21",
    fechaEntregaEstimada: "26 sep 2026",
  },
  {
    id: "lon-013",
    folio: 13,
    cliente: {
      nombre: "Barbería Classic Style",
      telefono: "5219991234567",
      empresa: "Zona Jaguar",
    },
    items: [
      {
        id: "item-013",
        descripcion: "Lona Front 13oz con ojillos",
        ancho: 3.0,
        alto: 1.0,
        cantidad: 1,
        m2: 3.0,
        costoPorM2: 65,
        precioVentaPorM2: 150,
        costoCalculado: 195,
        precioCalculado: 450,
        precioFinal: 450,
        costoFinal: 195,
      },
    ],
    subtotal: 450,
    descuento: 0,
    total: 450,
    anticipo: 0,
    pagos: [],
    saldo: 450,
    estado: "Cotización",
    fechaIngreso: "2026-09-22",
    fechaEntregaEstimada: "26 sep 2026",
  },
  {
    id: "lon-014",
    folio: 14,
    cliente: {
      nombre: "Papelería San José",
      telefono: "5215512345678",
      empresa: "Zona Oriente",
    },
    items: [
      {
        id: "item-014",
        descripcion: "Pendón Vertical con tubos",
        ancho: 1.0,
        alto: 1.8,
        cantidad: 1,
        m2: 1.8,
        costoPorM2: 85,
        precioVentaPorM2: 210,
        costoCalculado: 153,
        precioCalculado: 378,
        precioFinal: 380,
        costoFinal: 153,
      },
    ],
    subtotal: 380,
    descuento: 0,
    total: 380,
    anticipo: 100,
    pagos: [],
    saldo: 280,
    estado: "Aprobado",
    fechaIngreso: "2026-09-22",
    fechaEntregaEstimada: "27 sep 2026",
  },
  {
    id: "lon-015",
    folio: 15,
    cliente: {
      nombre: "Taller Mecánico El Rayo",
      telefono: "5219999011852",
      empresa: "Zona Poniente",
    },
    items: [
      {
        id: "item-015",
        descripcion: "Lona Impresa 13oz Reforzada",
        ancho: 2.0,
        alto: 1.2,
        cantidad: 1,
        m2: 2.4,
        costoPorM2: 65,
        precioVentaPorM2: 136.6,
        costoCalculado: 156,
        precioCalculado: 328,
        precioFinal: 328,
        costoFinal: 156,
      },
    ],
    subtotal: 328,
    descuento: 0,
    total: 328,
    anticipo: 0,
    pagos: [],
    saldo: 328,
    estado: "Cotización",
    fechaIngreso: "2026-09-23",
    fechaEntregaEstimada: "28 sep 2026",
  },
];

interface LonasOSProps {
  userEmail: string;
  onSyncWithTaskOS?: (order: LonasOrder) => void;
  onSyncWithFinanzas?: (order: LonasOrder) => void;
  onSendToPrint?: (printItem: PrintItem) => void;
  onNavigateToFinanzas?: () => void;
  onNavigateToUrls?: () => void;
  onSaveUrlToLibrary?: (item: Omit<UrlLibraryItem, "id" | "createdAt">) => void;
}

export default function LonasOS({
  userEmail,
  onSyncWithTaskOS,
  onSyncWithFinanzas,
  onSendToPrint,
  onNavigateToFinanzas,
  onNavigateToUrls,
  onSaveUrlToLibrary,
}: LonasOSProps) {
  const [orders, setOrders] = useState<LonasOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LONAS);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_LONAS_ORDERS;
  });

  const [activeTab, setActiveTab] = useState<"activos" | "terminados">("activos");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<LonasOrder | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Drive Link state in Modal
  const [driveUrlInput, setDriveUrlInput] = useState("");
  const [isEditingDrive, setIsEditingDrive] = useState(false);
  const [driveInputFolio, setDriveInputFolio] = useState<string | null>(null);

  // New Order Form state
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmpresa, setClientEmpresa] = useState("Zona Jaguar");
  const [itemDesc, setItemDesc] = useState("fachada");
  const [itemAncho, setItemAncho] = useState(4.0);
  const [itemAlto, setItemAlto] = useState(0.5);
  const [itemCantidad, setItemCantidad] = useState(1);
  const [costoPorM2, setCostoPorM2] = useState(65);
  const [precioVentaPorM2, setPrecioVentaPorM2] = useState(110);
  const [anticipoInicial, setAnticipoInicial] = useState(0);
  const [fechaEntrega, setFechaEntrega] = useState("12 sep 2026");
  const [itemDriveUrl, setItemDriveUrl] = useState("");

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LONAS, JSON.stringify(orders));
    } catch (_) {}
  }, [orders]);

  // Operational metrics matching Screenshot 2
  const activeOrders = orders.filter((o) => o.estado !== "Entregado");
  const completedOrders = orders.filter((o) => o.estado === "Entregado");
  const totalPorCobrar = activeOrders.reduce((sum, o) => sum + o.saldo, 0);
  const totalEnProduccion = activeOrders.filter(
    (o) => o.estado === "Producción" || o.estado === "Diseño" || o.estado === "Esperando aprobación"
  ).length;
  const totalCostosActivos = activeOrders.reduce(
    (sum, o) => sum + o.items.reduce((iSum, it) => iSum + it.costoFinal, 0),
    0
  );
  const totalVentasActivas = activeOrders.reduce((sum, o) => sum + o.total, 0);
  const totalUtilidadEstimada = totalVentasActivas - totalCostosActivos;

  // Filtered orders for table
  const displayedOrders = (activeTab === "activos" ? activeOrders : completedOrders).filter((o) => {
    const matchesSearch =
      o.cliente.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.cliente.empresa && o.cliente.empresa.toLowerCase().includes(searchQuery.toLowerCase())) ||
      String(o.folio).includes(searchQuery);

    if (!matchesSearch) return false;
    if (statusFilter === "todos") return true;
    return o.estado === statusFilter;
  });

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim()) return;

    const nextFolio = orders.length > 0 ? Math.max(...orders.map((o) => o.folio)) + 1 : 16;
    const m2 = Number((itemAncho * itemAlto * itemCantidad).toFixed(2));
    const costo = Number((m2 * costoPorM2).toFixed(2));
    const precio = Number((m2 * precioVentaPorM2).toFixed(2));
    const initialPayment = Math.min(anticipoInicial, precio);
    const initialSaldo = Math.max(0, precio - initialPayment);

    const newOrder: LonasOrder = {
      id: `lon-${Date.now()}`,
      folio: nextFolio,
      cliente: {
        nombre: clientName.trim(),
        telefono: clientPhone.trim(),
        empresa: clientEmpresa.trim() || "Zona Jaguar",
      },
      items: [
        {
          id: `item-${Date.now()}`,
          descripcion: itemDesc,
          ancho: itemAncho,
          alto: itemAlto,
          cantidad: itemCantidad,
          m2,
          costoPorM2,
          precioVentaPorM2,
          costoCalculado: costo,
          precioCalculado: precio,
          precioFinal: precio,
          costoFinal: costo,
        },
      ],
      subtotal: precio,
      descuento: 0,
      total: precio,
      anticipo: initialPayment,
      pagos: initialPayment > 0 ? [{ id: `p-${Date.now()}`, fecha: new Date().toISOString().slice(0, 10), monto: initialPayment, metodo: "Efectivo" }] : [],
      saldo: initialSaldo,
      estado: initialPayment > 0 ? "Producción" : "Cotización",
      fechaIngreso: new Date().toISOString().slice(0, 10),
      fechaEntregaEstimada: fechaEntrega,
      driveUrl: itemDriveUrl.trim() || undefined,
    };

    setOrders([newOrder, ...orders]);
    setIsNewOrderModalOpen(false);

    if (itemDriveUrl.trim() && onSaveUrlToLibrary) {
      onSaveUrlToLibrary({
        url: itemDriveUrl.trim(),
        title: `Diseño L-${String(newOrder.folio).padStart(3, "0")} • ${newOrder.cliente.nombre}`,
        categoria: "Diseño & Creatividad",
        descripcion: `Archivo de diseño en Google Drive para pedido L-${newOrder.folio} (${newOrder.cliente.empresa || "Zona Jaguar"}). Medidas: ${itemAncho}m x ${itemAlto}m.`,
        isDesignFile: true,
        driveUrl: itemDriveUrl.trim(),
        relatedOrderId: newOrder.id,
        relatedOrderFolio: newOrder.folio,
        clienteNombre: newOrder.cliente.nombre,
        empresaZona: newOrder.cliente.empresa,
        icon: "https://ssl.gstatic.com/docs/doclist/images/drive_icon_32.png",
        isFavorite: true,
        keywords: ["drive", "diseño", "lona", `l-${newOrder.folio}`, newOrder.cliente.nombre.toLowerCase()],
      });
    }

    setItemDriveUrl("");
    playChime("success");
    setActionFeedback(`Pedido L-${newOrder.folio} creado exitosamente.`);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleSaveOrderDriveUrl = (orderId: string, url: string) => {
    if (!url.trim()) return;
    const cleanUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return { ...o, driveUrl: cleanUrl };
      })
    );

    if (selectedOrderForModal && selectedOrderForModal.id === orderId) {
      setSelectedOrderForModal({
        ...selectedOrderForModal,
        driveUrl: cleanUrl,
      });
    }

    if (onSaveUrlToLibrary) {
      const targetOrder = orders.find((o) => o.id === orderId);
      if (targetOrder) {
        onSaveUrlToLibrary({
          url: cleanUrl,
          title: `Diseño L-${String(targetOrder.folio).padStart(3, "0")} • ${targetOrder.cliente.nombre}`,
          categoria: "Diseño & Creatividad",
          descripcion: `Archivo de diseño en Google Drive para pedido L-${targetOrder.folio} (${targetOrder.cliente.empresa || "Zona Jaguar"}).`,
          isDesignFile: true,
          driveUrl: cleanUrl,
          relatedOrderId: targetOrder.id,
          relatedOrderFolio: targetOrder.folio,
          clienteNombre: targetOrder.cliente.nombre,
          empresaZona: targetOrder.cliente.empresa,
          icon: "https://ssl.gstatic.com/docs/doclist/images/drive_icon_32.png",
          isFavorite: true,
          keywords: ["drive", "diseño", "lona", `l-${targetOrder.folio}`, targetOrder.cliente.nombre.toLowerCase()],
        });
      }
    }

    setIsEditingDrive(false);
    setDriveUrlInput("");
    playChime("success");
    setActionFeedback("¡Link de Drive del diseño vinculado y guardado exitosamente!");
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleCopyDriveLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      playChime("tick");
      setActionFeedback("Link de Drive copiado al portapapeles.");
      setTimeout(() => setActionFeedback(null), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAsPaid = (order: LonasOrder) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== order.id) return o;
        return {
          ...o,
          saldo: 0,
          anticipo: o.total,
          estado: o.estado === "Cotización" ? "Producción" : o.estado,
          pagos: [
            ...o.pagos,
            { id: `p-${Date.now()}`, fecha: new Date().toISOString().slice(0, 10), monto: o.saldo, metodo: "Efectivo", nota: "Liquidado al 100%" },
          ],
        };
      })
    );
    if (selectedOrderForModal && selectedOrderForModal.id === order.id) {
      setSelectedOrderForModal({
        ...selectedOrderForModal,
        saldo: 0,
        anticipo: selectedOrderForModal.total,
      });
    }
    playChime("work_done");
    setActionFeedback(`Pedido L-${order.folio} marcado como 100% pagado.`);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleDeleteOrder = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setSelectedOrderForModal(null);
    playChime("tick");
    setActionFeedback("Pedido eliminado del registro.");
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleDownloadOrderPNG = async (order: LonasOrder) => {
    const printItem: PrintItem = {
      id: `print-${order.id}`,
      tipo: "ticket_lona",
      folio: `L-${String(order.folio).padStart(3, "0")}`,
      titulo: `${order.cliente.nombre} • ${order.cliente.empresa || "Zona Jaguar"}`,
      clienteNombre: order.cliente.nombre,
      clienteTelefono: order.cliente.telefono,
      empresaZona: order.cliente.empresa,
      fecha: order.fechaIngreso,
      fechaEntrega: order.fechaEntregaEstimada,
      items: order.items.map((it) => ({
        descripcion: it.descripcion,
        detalle: `${it.ancho}m x ${it.alto}m • ${it.m2} m²`,
        cantidad: it.cantidad,
        subtotal: it.precioFinal,
      })),
      total: order.total,
      anticipo: order.anticipo,
      saldo: order.saldo,
      driveUrl: order.driveUrl,
      notas: order.notasInternas || `Total de lona: ${order.items.reduce((s, it) => s + it.m2, 0)} m²`,
      createdAt: new Date().toISOString(),
    };

    try {
      await downloadReceiptPNG(printItem);
      playChime("success");
      setActionFeedback("Ticket PNG generado y descargado exitosamente.");
      setTimeout(() => setActionFeedback(null), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendToPrintStation = (order: LonasOrder) => {
    if (onSendToPrint) {
      const printItem: PrintItem = {
        id: `print-${order.id}`,
        tipo: "ticket_lona",
        folio: `L-${String(order.folio).padStart(3, "0")}`,
        titulo: `${order.cliente.nombre} • ${order.cliente.empresa || "Zona Jaguar"}`,
        clienteNombre: order.cliente.nombre,
        clienteTelefono: order.cliente.telefono,
        empresaZona: order.cliente.empresa,
        fecha: order.fechaIngreso,
        fechaEntrega: order.fechaEntregaEstimada,
        items: order.items.map((it) => ({
          descripcion: it.descripcion,
          detalle: `${it.ancho}m x ${it.alto}m • ${it.m2} m²`,
          cantidad: it.cantidad,
          subtotal: it.precioFinal,
        })),
        total: order.total,
        anticipo: order.anticipo,
        saldo: order.saldo,
        metodoPago: "Efectivo / Transferencia",
        estado: order.estado,
        driveUrl: order.driveUrl,
        notas: order.notasInternas,
        origen: "lonas",
        createdAt: new Date().toISOString(),
      };
      onSendToPrint(printItem);
      playChime("tick");
    }
  };

  const handleCopyWhatsAppText = async (order: LonasOrder) => {
    const driveText = order.driveUrl ? `\n🎨 Archivo de diseño en Drive: ${order.driveUrl}` : "";
    const text = `Hola ${order.cliente.nombre}, te saludamos de Lonas. Tu pedido L-${order.folio} (${order.items[0]?.descripcion || "Lona"}) se encuentra en estado: *${order.estado}*. Total: $${order.total} MXN, Saldo: ${order.saldo > 0 ? `$${order.saldo} MXN` : "Pagado"}. Entrega: ${order.fechaEntregaEstimada}.${driveText}`;
    try {
      await navigator.clipboard.writeText(text);
      playChime("tick");
      setActionFeedback("¡Texto copiado para WhatsApp!");
      setTimeout(() => setActionFeedback(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div id="lonas-os-workspace" className="space-y-6">
      {/* Top Bar matching Screenshot 2 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
            TALLER DE PRODUCCIÓN
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-950 dark:text-white tracking-tight">
            Pedidos de lonas
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            Cotiza, controla pagos y acompaña cada lona hasta su entrega.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Link to Mi Salud Financiera (as in screenshot 2) */}
          <button
            onClick={() => {
              if (onNavigateToFinanzas) onNavigateToFinanzas();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold transition-all hover:bg-emerald-100"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
              💚
            </div>
            <div className="text-left">
              <span className="text-[9px] uppercase tracking-wider block font-black text-emerald-700 dark:text-emerald-400">
                ESPACIO PRIVADO
              </span>
              <span>Mi Salud Financiera &rarr;</span>
            </div>
          </button>

          {/* Date pill */}
          <div className="px-3.5 py-2 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs text-stone-700 dark:text-stone-300 font-bold">
            <span className="text-[9px] uppercase tracking-wider text-stone-400 block">HOY</span>
            <span>sábado, 26 de septiembre</span>
          </div>

          {/* New Order Button */}
          <button
            onClick={() => setIsNewOrderModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-stone-950 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-950 text-xs font-black shadow-md transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>Nuevo pedido</span>
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

      {/* 4 Stat Cards matching Screenshot 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Por cobrar (Navy card) */}
        <div className="p-5 rounded-3xl bg-[#0d182b] text-white shadow-lg space-y-1 relative overflow-hidden">
          <span className="text-xs font-bold text-stone-400 block">Por cobrar</span>
          <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
            ${totalPorCobrar.toLocaleString("es-MX")}
          </p>
          <span className="text-[11px] text-stone-400 block">{activeOrders.length} pedidos abiertos</span>
        </div>

        {/* Card 2: En producción */}
        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            En producción
          </span>
          <p className="text-2xl sm:text-3xl font-black text-stone-950 dark:text-white font-mono tracking-tight">
            {totalEnProduccion}
          </p>
          <span className="text-[11px] text-stone-400 block">diseño, aprobación o impresión</span>
        </div>

        {/* Card 3: Utilidad estimada */}
        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Utilidad estimada
          </span>
          <p className="text-2xl sm:text-3xl font-black text-stone-950 dark:text-white font-mono tracking-tight">
            ${totalUtilidadEstimada.toLocaleString("es-MX")}
          </p>
          <span className="text-[11px] text-stone-400 block">sobre pedidos abiertos</span>
        </div>

        {/* Card 4: Entregas próximas */}
        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Entregas próximas
          </span>
          <p className="text-2xl sm:text-3xl font-black text-stone-950 dark:text-white font-mono tracking-tight">
            0
          </p>
          <span className="text-[11px] text-stone-400 block">durante los siguientes 7 días</span>
        </div>
      </div>

      {/* Seguimiento Section Header & Table Filters matching Screenshot 2 */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-stone-950 dark:text-white tracking-tight">
              Seguimiento
            </h3>
            <span className="text-xs text-stone-500 font-bold">
              {activeOrders.length} pedidos activos
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Activos vs Terminados Pills */}
            <div className="flex items-center p-1 rounded-2xl bg-stone-100 dark:bg-stone-800 text-xs font-bold">
              <button
                onClick={() => setActiveTab("activos")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === "activos"
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 shadow-xs"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                Activos <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-stone-700 text-white font-mono">{activeOrders.length}</span>
              </button>
              <button
                onClick={() => setActiveTab("terminados")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === "terminados"
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 shadow-xs"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                Terminados <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-stone-300 dark:bg-stone-700 text-stone-900 dark:text-white font-mono">{completedOrders.length}</span>
              </button>
            </div>

            {/* View toggles: Grid vs Table */}
            <div className="flex items-center p-1 rounded-xl border border-stone-200 dark:border-stone-800">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg ${viewMode === "grid" ? "bg-stone-200 dark:bg-stone-700 text-stone-900" : "text-stone-400"}`}
                title="Vista cuadrícula"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg ${viewMode === "table" ? "bg-stone-200 dark:bg-stone-700 text-stone-900" : "text-stone-400"}`}
                title="Vista tabla"
              >
                <ListIcon size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter bar: Search input + Status dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar grupo, zona o pedido..."
              className="w-full pl-9 pr-3 py-2 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-800 dark:text-stone-200"
            >
              <option value="todos">Todos los estados</option>
              <option value="Cotización">Cotización</option>
              <option value="Diseño">Diseño</option>
              <option value="Producción">Producción</option>
              <option value="Listo">Listo</option>
              <option value="Entregado">Entregado</option>
            </select>
          </div>
        </div>

        {/* Orders Table matching Screenshot 2 */}
        {viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 text-[11px] font-bold text-stone-400 uppercase">
                  <th className="py-2.5 px-3">Pedido</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Entrega</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Saldo</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-medium">
                {displayedOrders.map((order) => {
                  const isPaid = order.saldo <= 0;
                  const folioStr = `L-${String(order.folio).padStart(3, "0")}`;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                    >
                      <td className="py-3 px-3 font-mono font-black text-stone-900 dark:text-stone-100">
                        {folioStr}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-stone-900 dark:text-stone-100">
                            {order.cliente.nombre}
                          </span>
                          {order.driveUrl && (
                            <a
                              href={order.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-[#eef5ff] dark:bg-[#073d83]/30 text-[#042f66] dark:text-[#ffd15c] text-[10px] font-bold hover:underline"
                              title="Abrir archivo de diseño en Google Drive ↗"
                            >
                              📁 Drive
                            </a>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {order.cliente.empresa || "Zona Jaguar"}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            order.estado === "Listo"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : order.estado === "Diseño"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              order.estado === "Listo"
                                ? "bg-emerald-500"
                                : order.estado === "Diseño"
                                ? "bg-purple-500"
                                : "bg-stone-400"
                            }`}
                          />
                          <span>{order.estado}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-stone-500 dark:text-stone-400">
                        {order.fechaEntregaEstimada}
                      </td>

                      <td className="py-3 px-3 font-mono font-black text-stone-900 dark:text-stone-100">
                        ${order.total.toLocaleString("es-MX")}
                      </td>

                      <td className="py-3 px-3 font-mono">
                        {isPaid ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            Pagado
                          </span>
                        ) : (
                          <span className="font-black text-stone-900 dark:text-stone-100">
                            ${order.saldo.toLocaleString("es-MX")}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopyWhatsAppText(order)}
                            className="px-2.5 py-1 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-800"
                          >
                            Mensaje
                          </button>
                          <button
                            onClick={() => setSelectedOrderForModal(order)}
                            className="px-3 py-1 rounded-xl bg-stone-950 text-white dark:bg-stone-100 dark:text-stone-950 text-xs font-bold hover:bg-stone-800"
                          >
                            Ver
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrderForModal(order)}
                className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 hover:border-amber-400 cursor-pointer space-y-2.5 bg-stone-50/50 dark:bg-stone-800/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-xs">L-{String(order.folio).padStart(3, "0")}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700">
                    {order.estado}
                  </span>
                </div>
                <div>
                  <h4 className="font-black text-sm">{order.cliente.nombre}</h4>
                  <p className="text-[11px] text-stone-400">{order.cliente.empresa || "Zona Jaguar"}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t text-xs font-mono">
                  <span>Total: ${order.total}</span>
                  <span className="font-bold text-amber-600">{order.saldo <= 0 ? "Pagado" : `Saldo $${order.saldo}`}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal matching Screenshot 1 exactly */}
      {selectedOrderForModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#0c182c] text-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto border border-blue-950">
            {/* Header matching Screenshot 1 */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono font-black uppercase tracking-wider text-blue-400">
                  L-{String(selectedOrderForModal.folio).padStart(3, "0")} • {selectedOrderForModal.cliente.empresa || "ZONA JAGUAR"}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                  {selectedOrderForModal.cliente.nombre}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Entrega: {selectedOrderForModal.fechaEntregaEstimada}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrderForModal(null)}
                className="w-8 h-8 rounded-full bg-blue-950/60 hover:bg-blue-900 text-stone-300 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {/* 3 Dark Blue Header Stat Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-[#14233c] border border-blue-900/60 space-y-1">
                <span className="text-xs text-stone-400 block">Precio al cliente</span>
                <p className="text-xl sm:text-2xl font-black font-mono text-white">
                  ${selectedOrderForModal.total.toFixed(2)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#14233c] border border-blue-900/60 space-y-1">
                <span className="text-xs text-stone-400 block">Saldo por cobrar</span>
                <p className="text-xl sm:text-2xl font-black font-mono text-white">
                  ${selectedOrderForModal.saldo.toFixed(2)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#14233c] border border-blue-900/60 space-y-1">
                <span className="text-xs text-stone-400 block">Utilidad estimada</span>
                <p className="text-xl sm:text-2xl font-black font-mono text-white">
                  ${(selectedOrderForModal.total - selectedOrderForModal.items.reduce((s, it) => s + it.costoFinal, 0)).toFixed(2)}
                </p>
              </div>
            </div>

            {/* ARTÍCULOS Section */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-stone-400 block">
                ARTÍCULOS
              </span>
              <div className="p-4 rounded-2xl bg-white text-stone-900 flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-sm">
                    {selectedOrderForModal.items[0]?.descripcion || "fachada"} x {selectedOrderForModal.items[0]?.cantidad || 1}
                  </h5>
                  <p className="text-xs text-stone-500 font-mono">
                    {selectedOrderForModal.items[0]?.ancho} m x {selectedOrderForModal.items[0]?.alto} m
                  </p>
                </div>
                <div className="font-black text-sm font-mono">
                  {selectedOrderForModal.items[0]?.m2?.toFixed(2)} m²
                </div>
              </div>
            </div>

            {/* ARCHIVO DE DISEÑO EN GOOGLE DRIVE (Todo Vinculado) */}
            <div className="space-y-2 p-4 rounded-2xl bg-[#14233c] border border-blue-900/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">📁</span>
                  <span className="text-xs font-black uppercase tracking-wider text-[#ffd15c]">
                    Archivo de Diseño Creado (Google Drive)
                  </span>
                </div>
                {selectedOrderForModal.driveUrl && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    ✓ Vinculado
                  </span>
                )}
              </div>

              {selectedOrderForModal.driveUrl ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#09101d] border border-blue-950 text-xs">
                    <a
                      href={selectedOrderForModal.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-300 hover:text-blue-200 underline font-mono truncate flex items-center gap-1.5"
                      title={selectedOrderForModal.driveUrl}
                    >
                      <ExternalLink size={13} className="shrink-0 text-amber-400" />
                      <span className="truncate">{selectedOrderForModal.driveUrl}</span>
                    </a>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyDriveLink(selectedOrderForModal.driveUrl!)}
                        className="px-2.5 py-1 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-[11px] font-bold text-white transition-colors"
                      >
                        Copiar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDriveInputFolio(selectedOrderForModal.id);
                          setDriveUrlInput(selectedOrderForModal.driveUrl || "");
                          setIsEditingDrive(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-950 hover:bg-blue-900 text-[11px] font-bold text-stone-300 transition-colors"
                      >
                        Editar
                      </button>
                    </div>
                  </div>

                  {isEditingDrive && driveInputFolio === selectedOrderForModal.id && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="url"
                        value={driveUrlInput}
                        onChange={(e) => setDriveUrlInput(e.target.value)}
                        placeholder="https://drive.google.com/file/d/..."
                        className="flex-1 px-3 py-2 rounded-xl bg-[#09101d] border border-blue-900 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveOrderDriveUrl(selectedOrderForModal.id, driveUrlInput)}
                        className="px-3 py-2 rounded-xl bg-[#f2ad00] hover:bg-[#ffd15c] text-[#1d1d1b] font-black text-xs shrink-0"
                      >
                        Guardar
                      </button>
                    </div>
                  )}

                  {onNavigateToUrls && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateToUrls();
                        setSelectedOrderForModal(null);
                      }}
                      className="text-[11px] text-[#ffd15c] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>🔗 Ver y gestionar en Biblioteca de URLs</span>
                      <span>&rarr;</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="pt-1 space-y-2">
                  <p className="text-[11px] text-stone-300">
                    Pega el enlace de Google Drive donde está el archivo del diseño creado para tenerlo todo vinculado con URLs, PRINT y WhatsApp.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={driveUrlInput}
                      onChange={(e) => setDriveUrlInput(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="flex-1 px-3 py-2 rounded-xl bg-[#09101d] border border-blue-900 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveOrderDriveUrl(selectedOrderForModal.id, driveUrlInput)}
                      className="px-3.5 py-2 rounded-xl bg-[#f2ad00] hover:bg-[#ffd15c] text-[#1d1d1b] font-black text-xs transition-colors shrink-0"
                    >
                      Vincular
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SEGUIMIENTO Section */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-stone-400 block">
                SEGUIMIENTO
              </span>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#14233c] border border-blue-900/40">
                  <span className="text-stone-400 block text-[11px]">Estado</span>
                  <span className="font-bold text-white text-sm">{selectedOrderForModal.estado}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#14233c] border border-blue-900/40">
                  <span className="text-stone-400 block text-[11px]">Anticipo</span>
                  <span className="font-bold text-white text-sm font-mono">${selectedOrderForModal.anticipo.toFixed(2)}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#14233c] border border-blue-900/40">
                  <span className="text-stone-400 block text-[11px]">Total de lona</span>
                  <span className="font-bold text-white text-sm font-mono">
                    {selectedOrderForModal.items.reduce((s, it) => s + it.m2, 0).toFixed(2)} m²
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#14233c] border border-blue-900/40">
                  <span className="text-stone-400 block text-[11px]">Contacto</span>
                  <span className="font-bold text-white text-sm">
                    {selectedOrderForModal.items[0]?.observaciones?.replace("Contacto: ", "") || "M. Máxima"}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#14233c] border border-blue-900/40">
                  <span className="text-stone-400 block text-[11px]">Costo de producción</span>
                  <span className="font-bold text-white text-sm font-mono">
                    ${selectedOrderForModal.items.reduce((s, it) => s + it.costoFinal, 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#14233c] border border-blue-900/40">
                  <span className="text-stone-400 block text-[11px]">Seguimiento</span>
                  <span className="font-bold text-white text-sm">Activo</span>
                </div>
              </div>
            </div>

            {/* Modal Action Buttons matching Screenshot 1 */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-blue-950">
              <div className="flex flex-wrap items-center gap-2">
                {/* Eliminar pill */}
                <button
                  onClick={() => handleDeleteOrder(selectedOrderForModal.id)}
                  className="px-4 py-2.5 rounded-2xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-bold transition-colors"
                >
                  Eliminar
                </button>

                {/* Copiar para WhatsApp */}
                <button
                  onClick={() => handleCopyWhatsAppText(selectedOrderForModal)}
                  className="px-4 py-2.5 rounded-2xl bg-white text-stone-900 hover:bg-stone-100 text-xs font-bold transition-colors"
                >
                  Copiar para WhatsApp
                </button>

                {/* Ticket PNG */}
                <button
                  onClick={() => handleDownloadOrderPNG(selectedOrderForModal)}
                  className="px-4 py-2.5 rounded-2xl bg-white text-stone-900 hover:bg-stone-100 text-xs font-bold transition-colors"
                >
                  Ticket PNG
                </button>

                {/* Ticket PDF */}
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 rounded-2xl bg-white text-stone-900 hover:bg-stone-100 text-xs font-bold transition-colors"
                >
                  Ticket PDF
                </button>

                {/* Mandar a PRINT Station */}
                <button
                  onClick={() => {
                    handleSendToPrintStation(selectedOrderForModal);
                    setSelectedOrderForModal(null);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-amber-500 text-stone-950 hover:bg-amber-400 text-xs font-black transition-colors"
                >
                  🖨️ Mandar a PRINT
                </button>
              </div>

              {/* Marcar como pagado */}
              <button
                onClick={() => handleMarkAsPaid(selectedOrderForModal)}
                className="px-5 py-2.5 rounded-2xl bg-[#09101d] text-white hover:bg-[#121c2e] border border-blue-900 text-xs font-black transition-all"
              >
                Marcar como pagado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-stone-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-base">Nuevo Pedido de Lonas</h3>
              <button onClick={() => setIsNewOrderModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-500 uppercase text-[10px]">Cliente</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nombre de cliente..."
                  className="w-full px-3 py-2 rounded-xl border mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-stone-500 uppercase text-[10px]">Teléfono WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="521999..."
                    className="w-full px-3 py-2 rounded-xl border mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-500 uppercase text-[10px]">Zona / Empresa</label>
                  <input
                    type="text"
                    value={clientEmpresa}
                    onChange={(e) => setClientEmpresa(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-stone-500 uppercase text-[10px]">Ancho (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={itemAncho}
                    onChange={(e) => setItemAncho(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-500 uppercase text-[10px]">Alto (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={itemAlto}
                    onChange={(e) => setItemAlto(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border mt-1 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-stone-500 uppercase text-[10px] flex items-center justify-between">
                  <span>📁 Link de Google Drive del Diseño Creado</span>
                  <span className="text-amber-500 font-normal">Todo Vinculado</span>
                </label>
                <input
                  type="url"
                  value={itemDriveUrl}
                  onChange={(e) => setItemDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/... (opcional)"
                  className="w-full px-3 py-2 rounded-xl border mt-1 font-mono text-xs"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl border font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-bold"
                >
                  Guardar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
