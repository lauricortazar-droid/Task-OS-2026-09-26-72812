import React, { useState, useEffect } from "react";
import {
  Wallet,
  DollarSign,
  AlertTriangle,
  Calendar,
  CreditCard,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Plus,
  TrendingDown,
  TrendingUp,
  HelpCircle,
  X,
  Play,
  Check,
  Building,
  Banknote,
  PiggyBank,
  Smartphone,
  RefreshCw,
  Printer,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  FinancialAccount,
  ExpectedIncome,
  FinancialDebt,
  FinancialCommitment,
  FinancialAllocation,
  AccountType,
  PrintItem,
} from "../types";
import { playChime } from "../utils/audio";

const STORAGE_KEY_FINANZAS_ACCOUNTS = "task_os_finanzas_accounts_v1";
const STORAGE_KEY_FINANZAS_INCOMES = "task_os_finanzas_incomes_v1";
const STORAGE_KEY_FINANZAS_DEBTS = "task_os_finanzas_debts_v1";
const STORAGE_KEY_FINANZAS_COMMITMENTS = "task_os_finanzas_commitments_v1";
const STORAGE_KEY_FINANZAS_ALLOCATIONS = "task_os_finanzas_allocations_v1";

const INITIAL_ACCOUNTS: FinancialAccount[] = [
  { id: "acc-1", nombre: "Cuentas y Líquido Confirmado", tipo: "Cuenta Bancaria", saldoActual: -11326 },
  { id: "acc-2", nombre: "Efectivo Caja Taller", tipo: "Efectivo", saldoActual: 0 },
];

const INITIAL_INCOMES: ExpectedIncome[] = [
  {
    id: "inc-molas",
    concepto: "MOLAS",
    montoEsperado: 6000,
    fechaEsperada: "11 sep 2026",
    montoRecibido: 0,
    estado: "Esperado",
    categoria: "Clientes Lonas",
  },
  {
    id: "inc-meds",
    concepto: "MEDS SPEEDY",
    montoEsperado: 5000,
    fechaEsperada: "14 sep 2026",
    montoRecibido: 0,
    estado: "Esperado",
    categoria: "Comercial",
  },
  {
    id: "inc-playa",
    concepto: "PLAYA",
    montoEsperado: 3500,
    fechaEsperada: "18 sep 2026",
    montoRecibido: 0,
    estado: "Esperado",
    categoria: "Servicios",
  },
];

const INITIAL_DEBTS: FinancialDebt[] = [
  {
    id: "deb-mp",
    acreedor: "MERCADO PAGO",
    concepto: "Línea de crédito / Terminal",
    montoOriginal: 1683,
    saldoActual: 1683,
    vencimiento: "14 sep 2026",
    pagoMinimo: 1683,
    prioridad: "Alta",
    estado: "Activa",
    historialPagos: [],
    notas: "El pago está vencido",
  },
  {
    id: "deb-telcel",
    acreedor: "Telcel",
    concepto: "Servicio de telefonía taller e internet",
    montoOriginal: 3000,
    saldoActual: 3000,
    vencimiento: "15 sep 2026",
    pagoMinimo: 3000,
    prioridad: "Alta",
    estado: "Activa",
    historialPagos: [],
    notas: "El pago está vencido",
  },
  {
    id: "deb-general",
    acreedor: "Deuda acumulada proveedores",
    concepto: "Insumos y rollos de lona",
    montoOriginal: 34238,
    saldoActual: 34238,
    vencimiento: "30 sep 2026",
    pagoMinimo: 4500,
    prioridad: "Media",
    estado: "Activa",
    historialPagos: [],
  },
];

const INITIAL_COMMITMENTS: FinancialCommitment[] = [
  {
    id: "com-apartados",
    concepto: "Apartados obligatorios + próximos pagos",
    monto: 9583,
    fechaVencimiento: "30 sep 2026",
    categoria: "Apartados",
    esRecurrente: true,
  },
];

const INITIAL_ALLOCATIONS: FinancialAllocation[] = [
  { id: "all-1", concepto: "Apartados inmediatos", montoApartado: 9583, estado: "Apartado" },
];

interface SaludFinancieraOSProps {
  userEmail: string;
  onSendToPrint?: (printItem: PrintItem) => void;
  onNavigateToLonas?: () => void;
}

export default function SaludFinancieraOS({ userEmail, onSendToPrint, onNavigateToLonas }: SaludFinancieraOSProps) {
  const [activeTab, setActiveTab] = useState<"inicio" | "movimientos" | "deudas" | "plan" | "calendario">("inicio");

  const [accounts, setAccounts] = useState<FinancialAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FINANZAS_ACCOUNTS);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_ACCOUNTS;
  });

  const [incomes, setIncomes] = useState<ExpectedIncome[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FINANZAS_INCOMES);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_INCOMES;
  });

  const [debts, setDebts] = useState<FinancialDebt[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FINANZAS_DEBTS);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_DEBTS;
  });

  const [commitments, setCommitments] = useState<FinancialCommitment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FINANZAS_COMMITMENTS);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_COMMITMENTS;
  });

  const [allocations, setAllocations] = useState<FinancialAllocation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FINANZAS_ALLOCATIONS);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_ALLOCATIONS;
  });

  // Action modals
  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false);
  const [isIngresoModalOpen, setIsIngresoModalOpen] = useState(false);
  const [isPagarDeudaModalOpen, setIsPagarDeudaModalOpen] = useState(false);
  const [selectedDebtToPay, setSelectedDebtToPay] = useState<FinancialDebt | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // New Gasto Form state
  const [gastoMonto, setGastoMonto] = useState<number>(150);
  const [gastoConcepto, setGastoConcepto] = useState("");

  // New Ingreso Form state
  const [ingresoMonto, setIngresoMonto] = useState<number>(1000);
  const [ingresoConcepto, setIngresoConcepto] = useState("");

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FINANZAS_ACCOUNTS, JSON.stringify(accounts));
      localStorage.setItem(STORAGE_KEY_FINANZAS_INCOMES, JSON.stringify(incomes));
      localStorage.setItem(STORAGE_KEY_FINANZAS_DEBTS, JSON.stringify(debts));
      localStorage.setItem(STORAGE_KEY_FINANZAS_COMMITMENTS, JSON.stringify(commitments));
      localStorage.setItem(STORAGE_KEY_FINANZAS_ALLOCATIONS, JSON.stringify(allocations));
    } catch (_) {}
  }, [accounts, incomes, debts, commitments, allocations]);

  // PRINCIPIO RECTOR:
  // Lo que tengo:
  const loQueTengo = accounts.reduce((sum, a) => sum + a.saldoActual, 0);

  // Ya comprometido:
  const yaComprometido = allocations
    .filter((al) => al.estado === "Apartado")
    .reduce((sum, al) => sum + al.montoApartado, 0);

  // DISPONIBLE REAL = Lo que tengo - Ya comprometido
  const disponibleReal = loQueTengo - yaComprometido;

  // Deuda total conocida:
  const deudaTotalConocida = debts
    .filter((d) => d.estado === "Activa")
    .reduce((sum, d) => sum + d.saldoActual, 0);

  const handleRegisterGasto = (e: React.FormEvent) => {
    e.preventDefault();
    if (gastoMonto <= 0) return;
    setAccounts((prev) =>
      prev.map((acc, idx) => (idx === 0 ? { ...acc, saldoActual: acc.saldoActual - gastoMonto } : acc))
    );
    setIsGastoModalOpen(false);
    playChime("tick");
    setActionFeedback(`Gasto de $${gastoMonto} registrado.`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleRegisterIngreso = (e: React.FormEvent) => {
    e.preventDefault();
    if (ingresoMonto <= 0) return;
    setAccounts((prev) =>
      prev.map((acc, idx) => (idx === 0 ? { ...acc, saldoActual: acc.saldoActual + ingresoMonto } : acc))
    );
    setIsIngresoModalOpen(false);
    playChime("success");
    setActionFeedback(`Ingreso de $${ingresoMonto} confirmado.`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handlePagarDeuda = (debt: FinancialDebt) => {
    setDebts((prev) =>
      prev.map((d) => (d.id === debt.id ? { ...d, saldoActual: Math.max(0, d.saldoActual - debt.pagoMinimo) } : d))
    );
    setAccounts((prev) =>
      prev.map((acc, idx) => (idx === 0 ? { ...acc, saldoActual: acc.saldoActual - debt.pagoMinimo } : acc))
    );
    setIsPagarDeudaModalOpen(false);
    playChime("work_done");
    setActionFeedback(`Pago a ${debt.acreedor} registrado.`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleSendPaymentToPrint = (debt: FinancialDebt) => {
    if (onSendToPrint) {
      onSendToPrint({
        id: `print-debt-${debt.id}-${Date.now()}`,
        tipo: "comprobante_pago",
        folio: `PAG-${debt.acreedor.slice(0, 3).toUpperCase()}`,
        titulo: `Pago a ${debt.acreedor}`,
        clienteNombre: debt.acreedor,
        fecha: new Date().toISOString().slice(0, 10),
        items: [
          {
            descripcion: debt.concepto,
            cantidad: 1,
            subtotal: debt.pagoMinimo,
          },
        ],
        total: debt.pagoMinimo,
        anticipo: debt.pagoMinimo,
        saldo: Math.max(0, debt.saldoActual - debt.pagoMinimo),
        metodoPago: "Transferencia Bancaria",
        estado: "Pagado",
        notas: `Comprobante de abono a deuda. Vencimiento: ${debt.vencimiento}`,
        origen: "finanzas",
        createdAt: new Date().toISOString(),
      });
      playChime("tick");
    }
  };

  const handleSendIncomeToPrint = (inc: ExpectedIncome) => {
    if (onSendToPrint) {
      onSendToPrint({
        id: `print-inc-${inc.id}`,
        tipo: "comprobante_pago",
        folio: `REC-${inc.concepto.slice(0, 3).toUpperCase()}`,
        titulo: `Ingreso / Recibo • ${inc.concepto}`,
        clienteNombre: inc.concepto,
        fecha: inc.fechaEsperada,
        items: [
          {
            descripcion: `Cobro programado: ${inc.categoria}`,
            cantidad: 1,
            subtotal: inc.montoEsperado,
          },
        ],
        total: inc.montoEsperado,
        anticipo: inc.montoEsperado,
        saldo: 0,
        metodoPago: "Transferencia BBVA / Efectivo",
        estado: "Esperado",
        notas: "Comprobante de ingreso programado generado en Salud Financiera.",
        origen: "finanzas",
        createdAt: new Date().toISOString(),
      });
      playChime("tick");
    }
  };

  return (
    <div id="salud-financiera-workspace" className="space-y-6">
      {/* Top Bar with user & date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            💚
          </div>
          <div>
            <h3 className="text-base font-black text-stone-900 dark:text-stone-100 tracking-tight">
              Mi Salud Financiera
            </h3>
            <span className="text-[11px] font-bold text-stone-400">
              Espacio Privado • Solo tú ves estos datos
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-bold">Hola Pepe</span>
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
              P
            </div>
          </div>
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

      {/* Main Financial Header */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 font-mono">
            HOY • 26 SEP 2026
          </span>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            <span>Salud financiera: En riesgo</span>
          </div>
        </div>
        <h2 className="text-2xl sm:text-4xl font-black text-stone-950 dark:text-white tracking-tight">
          Tu dinero, sin ilusiones.
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
          Primero protege lo comprometido. Lo demás sí está disponible.
        </p>
      </div>

      {/* 4 Financial Core Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Lo que tengo */}
        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Lo que tengo
          </span>
          <p className="text-2xl sm:text-3xl font-black text-stone-950 dark:text-white font-mono tracking-tight">
            -${Math.abs(loQueTengo).toLocaleString("es-MX")}
          </p>
          <span className="text-[11px] text-stone-400 block">Solo dinero confirmado</span>
        </div>

        {/* Card 2: Ya comprometido */}
        <div className="p-5 rounded-3xl bg-[#fef9ec] dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 shadow-xs space-y-1">
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
            Ya comprometido
          </span>
          <p className="text-2xl sm:text-3xl font-black text-amber-900 dark:text-amber-200 font-mono tracking-tight">
            ${yaComprometido.toLocaleString("es-MX")}
          </p>
          <span className="text-[11px] text-amber-700/80 dark:text-amber-400 block">
            Apartados + próximos pagos
          </span>
        </div>

        {/* Card 3: Disponible Real (Red Card when negative!) */}
        <div className="p-5 rounded-3xl bg-[#992a2a] text-white shadow-lg space-y-1">
          <span className="text-xs font-black uppercase tracking-wider text-rose-200 block">
            Disponible real
          </span>
          <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight">
            -${Math.abs(disponibleReal).toLocaleString("es-MX")}
          </p>
          <span className="text-[11px] text-rose-100 block">Necesitas cubrir el déficit</span>
        </div>

        {/* Card 4: Deuda total conocida */}
        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Deuda total conocida
          </span>
          <p className="text-2xl sm:text-3xl font-black text-stone-950 dark:text-white font-mono tracking-tight">
            ${deudaTotalConocida.toLocaleString("es-MX")}
          </p>
          <span className="text-[11px] text-stone-400 block">{debts.length} montos pendientes</span>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="rounded-2xl bg-[#0f281e] text-emerald-200 p-3.5 sm:p-4 font-mono text-xs sm:text-sm font-bold flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-xs text-emerald-400 uppercase tracking-wider">
            SALDO CONFIRMADO
          </span>
          <span className="text-white font-black">-${Math.abs(loQueTengo).toLocaleString("es-MX")}</span>
        </div>
        <span className="text-emerald-500 font-black">—</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-xs text-emerald-400 uppercase tracking-wider">
            COMPROMETIDO
          </span>
          <span className="text-white font-black">${yaComprometido.toLocaleString("es-MX")}</span>
        </div>
        <span className="text-emerald-500 font-black">=</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-xs text-rose-300 uppercase tracking-wider">
            DISPONIBLE REAL
          </span>
          <span className="text-rose-400 font-black">-${Math.abs(disponibleReal).toLocaleString("es-MX")}</span>
        </div>
      </div>

      {/* 3 Quick Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setIsGastoModalOpen(true)}
          className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-400 text-left transition-all flex items-center justify-between shadow-xs active:scale-98"
        >
          <div>
            <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-stone-100 text-sm">
              <ArrowUpRight size={16} className="text-rose-500" />
              <span>Registrar gasto</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">En menos de 20 segundos</p>
          </div>
          <span className="text-stone-300">↗</span>
        </button>

        <button
          onClick={() => setIsIngresoModalOpen(true)}
          className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-emerald-400 text-left transition-all flex items-center justify-between shadow-xs active:scale-98"
        >
          <div>
            <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-stone-100 text-sm">
              <ArrowDownRight size={16} className="text-emerald-500" />
              <span>Registrar ingreso</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">Recibido o esperado</p>
          </div>
          <span className="text-stone-300">↙</span>
        </button>

        <button
          onClick={() => setIsPagarDeudaModalOpen(true)}
          className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-blue-400 text-left transition-all flex items-center justify-between shadow-xs active:scale-98"
        >
          <div>
            <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-stone-100 text-sm">
              <CreditCard size={16} className="text-blue-500" />
              <span>Pagar deuda</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">Actualiza el saldo</p>
          </div>
          <span className="text-stone-300">💳</span>
        </button>
      </div>

      {/* Two Columns: Decisión de hoy & Próximo dinero que entra */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: DECISIÓN DE HOY: Qué pagar primero */}
        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                DECISIÓN DE HOY
              </span>
              <h4 className="text-base font-black text-stone-900 dark:text-stone-100">
                Qué pagar primero
              </h4>
            </div>
            <button
              onClick={() => setIsPagarDeudaModalOpen(true)}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Ver plan &gt;
            </button>
          </div>

          <div className="space-y-3">
            {debts.slice(0, 3).map((d, idx) => (
              <div
                key={d.id}
                className="p-3.5 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <h5 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                      {d.acreedor}
                    </h5>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                      El pago está vencido • {d.vencimiento}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                    ${d.pagoMinimo.toLocaleString("es-MX")}
                  </span>
                  {onSendToPrint && (
                    <button
                      onClick={() => handleSendPaymentToPrint(d)}
                      className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"
                      title="Mandar comprobante a PRINT 🖨️"
                    >
                      <Printer size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => handlePagarDeuda(d)}
                    className="px-2.5 py-1 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-[11px] font-bold"
                  >
                    Pagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: PRÓXIMO DINERO QUE ENTRA: Ingresos esperados */}
        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                PRÓXIMO DINERO QUE ENTRA
              </span>
              <h4 className="text-base font-black text-stone-900 dark:text-stone-100">
                Ingresos esperados
              </h4>
            </div>
            <button
              onClick={() => setIsIngresoModalOpen(true)}
              className="p-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200"
              title="Registrar nuevo ingreso esperado"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="space-y-3">
            {incomes.map((inc) => (
              <div
                key={inc.id}
                className="p-3.5 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <ArrowDownRight size={15} />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                      {inc.concepto}
                    </h5>
                    <p className="text-[11px] text-stone-400 font-mono">
                      {inc.fechaEsperada} • {inc.estado}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                    ${inc.montoEsperado.toLocaleString("es-MX")}
                  </span>
                  {onSendToPrint && (
                    <button
                      onClick={() => handleSendIncomeToPrint(inc)}
                      className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"
                      title="Mandar recibo a PRINT 🖨️"
                    >
                      <Printer size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gasto Modal */}
      {isGastoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl p-5 shadow-2xl space-y-4">
            <h4 className="font-black text-sm text-stone-900 dark:text-stone-100">Registrar Gasto Rápido</h4>
            <form onSubmit={handleRegisterGasto} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase">Monto ($ MXN)</label>
                <input
                  type="number"
                  required
                  value={gastoMonto}
                  onChange={(e) => setGastoMonto(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 text-lg font-mono font-bold"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGastoModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border text-xs"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs">
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ingreso Modal */}
      {isIngresoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl p-5 shadow-2xl space-y-4">
            <h4 className="font-black text-sm text-stone-900 dark:text-stone-100">Registrar Ingreso</h4>
            <form onSubmit={handleRegisterIngreso} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase">Monto ($ MXN)</label>
                <input
                  type="number"
                  required
                  value={ingresoMonto}
                  onChange={(e) => setIngresoMonto(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 text-lg font-mono font-bold"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsIngresoModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border text-xs"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs">
                  Confirmar Ingreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pagar Deuda Modal */}
      {isPagarDeudaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-black text-sm text-stone-900 dark:text-stone-100">Pagar Deuda / Abono</h4>
              <button onClick={() => setIsPagarDeudaModalOpen(false)} className="text-stone-400">
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {debts.map((d) => (
                <div
                  key={d.id}
                  className="p-3 rounded-2xl border border-stone-200 dark:border-stone-800 flex items-center justify-between"
                >
                  <div>
                    <h5 className="font-bold text-xs">{d.acreedor}</h5>
                    <p className="text-[11px] text-stone-400 font-mono">Saldo: ${d.saldoActual.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => handlePagarDeuda(d)}
                    className="px-3 py-1.5 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-bold"
                  >
                    Abonar ${d.pagoMinimo}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
