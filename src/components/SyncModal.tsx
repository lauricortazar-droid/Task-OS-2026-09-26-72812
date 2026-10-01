import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Smartphone,
  Laptop,
  QrCode,
  RefreshCw,
  Mail,
  Check,
  Copy,
  Share2,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Lock,
  Phone,
  KeyRound,
  LogIn,
  LogOut,
  UserPlus,
  Flame,
  Apple,
  Info,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import QRCode from "qrcode";
import { SyncStatus, TaskItem } from "../types";
import { playChime } from "../utils/audio";
import {
  auth,
  googleSignIn,
  appleSignIn,
  loginWithEmail,
  registerWithEmail,
  resetPassword,
  initRecaptchaVerifier,
  sendPhoneCode,
  verifyPhoneCode,
  logout,
  getFriendlyAuthErrorMessage,
} from "../lib/firebase";
import { User, ConfirmationResult } from "firebase/auth";

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: SyncStatus;
  onChangeEmail: (newEmail: string) => void;
  onForceSync: () => void;
  tasks: TaskItem[];
  esencialTaskId: number | null;
  secundariasTaskIds: number[];
}

export default function SyncModal({
  isOpen,
  onClose,
  syncStatus,
  onChangeEmail,
  onForceSync,
  tasks,
  esencialTaskId,
  secundariasTaskIds,
}: SyncModalProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"auth" | "pairing" | "apple_setup">("auth");

  // Firebase Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [authMode, setAuthMode] = useState<"email_login" | "email_register" | "email_reset" | "phone">("email_login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authPhone, setAuthPhone] = useState("+52 ");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [copyDomainFeedback, setCopyDomainFeedback] = useState<string | null>(null);

  // Pairing state
  const [emailInput, setEmailInput] = useState(syncStatus.email || "laurcortazar@gmail.com");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [emailDigestStatus, setEmailDigestStatus] = useState<"idle" | "loading" | "copied" | "sent">("idle");

  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Listen to Auth state changes
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setCurrentUser(u);
      if (u?.email) {
        setEmailInput(u.email);
        onChangeEmail(u.email);
      }
    });
    return () => unsub();
  }, [onChangeEmail]);

  // Keep local email input in sync
  useEffect(() => {
    if (syncStatus.email) {
      setEmailInput(syncStatus.email);
    }
  }, [syncStatus.email]);

  // Construct mobile pairing link
  const pairingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}?syncEmail=${encodeURIComponent(
          emailInput.trim()
        )}`
      : "";

  // Generate QR code whenever pairing URL changes
  useEffect(() => {
    if (!isOpen || !pairingUrl) return;

    QRCode.toDataURL(pairingUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: "#1c1917", // stone-900
        light: "#ffffff",
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error("Error generating QR code:", err));
  }, [isOpen, pairingUrl]);

  if (!isOpen) return null;

  // Clear messages on tab change
  const handleTabChange = (tab: "auth" | "pairing" | "apple_setup") => {
    setActiveTab(tab);
    setAuthError(null);
    setAuthSuccessMsg(null);
  };

  // Google Sign-in handler
  const handleGoogleSignIn = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    setAuthSuccessMsg(null);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setAuthSuccessMsg(`¡Bienvenido, ${res.user.displayName || res.user.email}!`);
        playChime("success");
      }
    } catch (err: any) {
      setAuthError(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Apple Sign-in handler
  const handleAppleSignIn = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    setAuthSuccessMsg(null);
    try {
      const user = await appleSignIn();
      setAuthSuccessMsg(`¡Sesión iniciada con Apple ID: ${user.email || user.uid}!`);
      playChime("success");
    } catch (err: any) {
      setAuthError(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Email & Password Submit
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) {
      setAuthError("Por favor ingresa un correo electrónico.");
      return;
    }

    setIsLoadingAuth(true);
    setAuthError(null);
    setAuthSuccessMsg(null);

    try {
      if (authMode === "email_login") {
        if (!authPassword) throw new Error("Ingresa tu contraseña.");
        const user = await loginWithEmail(authEmail, authPassword);
        setAuthSuccessMsg(`¡Sesión iniciada correctamente como ${user.email}!`);
        playChime("success");
      } else if (authMode === "email_register") {
        if (authPassword.length < 6) {
          throw new Error("La contraseña debe tener mínimo 6 caracteres.");
        }
        const user = await registerWithEmail(authEmail, authPassword, authDisplayName);
        setAuthSuccessMsg(`¡Cuenta creada exitosamente para ${user.email}!`);
        playChime("success");
      } else if (authMode === "email_reset") {
        await resetPassword(authEmail);
        setAuthSuccessMsg(`Enlace de restablecimiento enviado a ${authEmail}. Revisa tu bandeja de entrada.`);
        playChime("tick");
      }
    } catch (err: any) {
      setAuthError(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Phone Auth: Send Verification SMS
  const handleSendPhoneSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authPhone.trim() || authPhone.trim().length < 8) {
      setAuthError("Por favor ingresa un número telefónico completo con código de país (ej. +52 55 1234 5678).");
      return;
    }

    setIsLoadingAuth(true);
    setAuthError(null);
    setAuthSuccessMsg(null);

    try {
      const verifier = initRecaptchaVerifier("recaptcha-phone-container");
      const confirmResult = await sendPhoneCode(authPhone, verifier);
      setConfirmationResult(confirmResult);
      setAuthSuccessMsg(`Código de verificación enviado por SMS a ${authPhone}.`);
      playChime("tick");
    } catch (err: any) {
      setAuthError(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Phone Auth: Confirm SMS Code
  const handleVerifyPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) {
      setAuthError("Primero solicita el código SMS.");
      return;
    }
    if (!verificationCode.trim() || verificationCode.trim().length < 6) {
      setAuthError("Ingresa el código de 6 dígitos recibido por SMS.");
      return;
    }

    setIsLoadingAuth(true);
    setAuthError(null);
    setAuthSuccessMsg(null);

    try {
      const user = await verifyPhoneCode(confirmationResult, verificationCode);
      setAuthSuccessMsg(`¡Teléfono verificado! Sesión iniciada: ${user.phoneNumber || user.uid}`);
      setConfirmationResult(null);
      setVerificationCode("");
      playChime("success");
    } catch (err: any) {
      setAuthError(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    setIsLoadingAuth(true);
    try {
      await logout();
      setAuthSuccessMsg("Sesión cerrada correctamente.");
      playChime("tick");
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({
          title: "Task-OS Móvil",
          text: "Abre Task-OS sincronizado en tu celular",
          url: pairingUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(pairingUrl);
      setCopiedLink(true);
      playChime("tick");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error("Failed to copy pairing link", e);
    }
  };

  const handleSendEmailDigest = async () => {
    setEmailDigestStatus("loading");
    try {
      const res = await fetch("/api/sync/email-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.trim(),
          tasks,
          esencialTaskId,
          secundariasTaskIds,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const mailtoUrl = `mailto:${encodeURIComponent(data.email)}?subject=${encodeURIComponent(
          data.subject
        )}&body=${encodeURIComponent(data.bodyText)}`;
        window.location.href = mailtoUrl;

        try {
          await navigator.clipboard.writeText(data.bodyText);
        } catch (_) {}

        setEmailDigestStatus("sent");
        playChime("success");
        setTimeout(() => setEmailDigestStatus("idle"), 4000);
      } else {
        setEmailDigestStatus("idle");
      }
    } catch (err) {
      console.error("Error creating email summary:", err);
      setEmailDigestStatus("idle");
    }
  };

  return (
    <div
      id="sync-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="sync-modal-container"
        className="relative w-full max-w-xl bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-stone-950 flex items-center justify-center font-black shadow-sm">
              <Flame size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Firebase Backend & Autenticación
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Tiempo Real
                </span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Firestore • Email • Google • Teléfono SMS • Apple (gen-lang-client-0098696571)
              </p>
            </div>
          </div>
          <button
            id="close-sync-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-800/40 p-1.5 gap-1 text-xs font-semibold">
          <button
            onClick={() => handleTabChange("auth")}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "auth"
                ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-bold"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            <ShieldCheck size={14} className="text-amber-500" />
            <span>Autenticación</span>
          </button>

          <button
            onClick={() => handleTabChange("pairing")}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "pairing"
                ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-bold"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            <QrCode size={14} className="text-blue-500" />
            <span>Celular & QR</span>
          </button>

          <button
            onClick={() => handleTabChange("apple_setup")}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "apple_setup"
                ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-bold"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            <Apple size={14} className="text-stone-800 dark:text-stone-200" />
            <span>App de Apple</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Status Banners */}
          {authSuccessMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>{authSuccessMsg}</span>
            </div>
          )}

          {authError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle size={17} className="text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <span className="font-semibold block">{authError}</span>

                {(authError.includes("unauthorized-domain") || authError.includes("Dominio no autorizado")) && (
                  <div className="mt-2 pt-2 border-t border-rose-200/80 dark:border-rose-800/60 space-y-2 text-[11px]">
                    <p className="font-semibold text-stone-800 dark:text-stone-200">
                      Dominios a registrar en Firebase Console:
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 font-mono font-bold">
                        <span>l.fgdll.org</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("l.fgdll.org");
                            setCopyDomainFeedback("¡Copiado: l.fgdll.org!");
                            setTimeout(() => setCopyDomainFeedback(null), 3000);
                          }}
                          className="p-0.5 hover:text-stone-900 dark:hover:text-stone-100"
                          title="Copiar l.fgdll.org"
                        >
                          <Copy size={12} />
                        </button>
                      </div>

                      {typeof window !== "undefined" && window.location.hostname !== "l.fgdll.org" && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 font-mono font-bold">
                          <span>{window.location.hostname}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(window.location.hostname);
                              setCopyDomainFeedback(`¡Copiado: ${window.location.hostname}!`);
                              setTimeout(() => setCopyDomainFeedback(null), 3000);
                            }}
                            className="p-0.5 hover:text-stone-900 dark:hover:text-stone-100"
                            title="Copiar dominio actual"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      )}

                      <a
                        href="https://console.firebase.google.com/project/gen-lang-client-0098696571/authentication/settings"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold"
                      >
                        <span>Ir a Firebase Settings</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                    {copyDomainFeedback && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold block">
                        {copyDomainFeedback}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: FIREBASE AUTHENTICATION */}
          {activeTab === "auth" && (
            <div className="space-y-4">
              {/* Logged in state card */}
              {currentUser ? (
                <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                        {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : currentUser.email ? currentUser.email[0].toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                            {currentUser.displayName || currentUser.email || currentUser.phoneNumber || "Usuario Autenticado"}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                            Conectado
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                          UID: {currentUser.uid.slice(0, 16)}...
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleSignOut}
                      disabled={isLoadingAuth}
                      className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 text-stone-700 dark:text-stone-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
                    >
                      <LogOut size={13} />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40">
                    <div className="p-2 rounded-xl bg-white/70 dark:bg-stone-900/60">
                      <span className="text-[10px] text-stone-500 block">Proveedor Auth:</span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {currentUser.providerData[0]?.providerId || "firebase"}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/70 dark:bg-stone-900/60">
                      <span className="text-[10px] text-stone-500 block">Sincronización Firestore:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Activa en Tiempo Real
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Not logged in: Providers selector & forms */
                <div className="space-y-4">
                  {/* Quick One-Click Providers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={isLoadingAuth}
                      className="w-full py-2.5 px-3 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-amber-400 dark:hover:border-amber-500 text-stone-800 dark:text-stone-200 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs active:scale-[0.98]"
                    >
                      <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-blue-500 p-0.5 flex items-center justify-center">
                        <div className="w-full h-full bg-white dark:bg-stone-900 rounded-full flex items-center justify-center text-[8px] font-black text-amber-500">
                          G
                        </div>
                      </div>
                      <span>Continuar con Google</span>
                    </button>

                    <button
                      onClick={handleAppleSignIn}
                      disabled={isLoadingAuth}
                      className="w-full py-2.5 px-3 rounded-2xl border border-stone-900 dark:border-stone-700 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs active:scale-[0.98]"
                    >
                      <Apple size={15} />
                      <span>Continuar con Apple</span>
                    </button>
                  </div>

                  <div className="relative flex items-center justify-center my-3">
                    <div className="border-t border-stone-200 dark:border-stone-800 w-full" />
                    <span className="bg-white dark:bg-stone-900 px-3 text-[11px] font-semibold text-stone-400 absolute">
                      O usa correo o teléfono SMS
                    </span>
                  </div>

                  {/* Auth mode selector tabs */}
                  <div className="flex rounded-xl bg-stone-100 dark:bg-stone-800/60 p-1 gap-1 text-[11px] font-bold">
                    <button
                      onClick={() => {
                        setAuthMode("email_login");
                        setAuthError(null);
                      }}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        authMode === "email_login"
                          ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs"
                          : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      Correo / Password
                    </button>
                    <button
                      onClick={() => {
                        setAuthMode("email_register");
                        setAuthError(null);
                      }}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        authMode === "email_register"
                          ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs"
                          : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      Registrar
                    </button>
                    <button
                      onClick={() => {
                        setAuthMode("phone");
                        setAuthError(null);
                      }}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        authMode === "phone"
                          ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs"
                          : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      Teléfono SMS
                    </button>
                  </div>

                  {/* Mode: Email Login & Register & Reset */}
                  {(authMode === "email_login" || authMode === "email_register" || authMode === "email_reset") && (
                    <form onSubmit={handleEmailAuthSubmit} className="space-y-3">
                      {authMode === "email_register" && (
                        <div>
                          <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                            Nombre Completo
                          </label>
                          <input
                            type="text"
                            placeholder="Pepe Cortazar"
                            value={authDisplayName}
                            onChange={(e) => setAuthDisplayName(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      )}

                      <div>
                        <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                          Correo Electrónico
                        </label>
                        <div className="relative">
                          <Mail size={14} className="absolute left-3 top-2.5 text-stone-400" />
                          <input
                            type="email"
                            required
                            placeholder="usuario@l.fgdll.org"
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      {authMode !== "email_reset" && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400">
                              Contraseña
                            </label>
                            {authMode === "email_login" && (
                              <button
                                type="button"
                                onClick={() => setAuthMode("email_reset")}
                                className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
                              >
                                ¿Olvidaste tu contraseña?
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <Lock size={14} className="absolute left-3 top-2.5 text-stone-400" />
                            <input
                              type="password"
                              required
                              placeholder="••••••••"
                              value={authPassword}
                              onChange={(e) => setAuthPassword(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isLoadingAuth}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
                      >
                        {isLoadingAuth ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : authMode === "email_login" ? (
                          <LogIn size={14} />
                        ) : authMode === "email_register" ? (
                          <UserPlus size={14} />
                        ) : (
                          <KeyRound size={14} />
                        )}
                        <span>
                          {authMode === "email_login"
                            ? "Iniciar Sesión"
                            : authMode === "email_register"
                            ? "Crear Cuenta con Email"
                            : "Enviar Enlace de Recuperación"}
                        </span>
                      </button>

                      {authMode === "email_reset" && (
                        <button
                          type="button"
                          onClick={() => setAuthMode("email_login")}
                          className="w-full text-center text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                        >
                          Volver al inicio de sesión
                        </button>
                      )}
                    </form>
                  )}

                  {/* Mode: Phone Authentication (SMS) */}
                  {authMode === "phone" && (
                    <div className="space-y-3">
                      {!confirmationResult ? (
                        <form onSubmit={handleSendPhoneSms} className="space-y-3">
                          <div>
                            <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                              Número de Teléfono Móvil (formato internacional E.164)
                            </label>
                            <div className="relative">
                              <Phone size={14} className="absolute left-3 top-2.5 text-stone-400" />
                              <input
                                type="tel"
                                required
                                placeholder="+52 55 1234 5678"
                                value={authPhone}
                                onChange={(e) => setAuthPhone(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <span className="text-[10px] text-stone-400 mt-1 block">
                              Ejemplos: +52 55... (México), +1... (EE. UU.), +34... (España).
                            </span>
                          </div>

                          {/* Invisible / Visible container for reCAPTCHA */}
                          <div id="recaptcha-phone-container" className="my-2 flex justify-center" />

                          <button
                            type="submit"
                            disabled={isLoadingAuth}
                            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
                          >
                            {isLoadingAuth ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Phone size={14} />
                            )}
                            <span>Enviar Código de Verificación SMS</span>
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handleVerifyPhoneCode} className="space-y-3">
                          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200">
                            Ingresa el código de 6 dígitos que enviamos por SMS al teléfono:{" "}
                            <strong>{authPhone}</strong>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                              Código de 6 dígitos
                            </label>
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="123456"
                              autoFocus
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                              className="w-full tracking-widest text-center text-lg font-mono font-bold px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isLoadingAuth || verificationCode.length < 6}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
                          >
                            {isLoadingAuth ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            <span>Confirmar Código e Iniciar Sesión</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setConfirmationResult(null);
                              setVerificationCode("");
                            }}
                            className="w-full text-center text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                          >
                            Reintentar con otro número
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Firestore Real-Time info */}
              <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-stone-700 dark:text-stone-300">
                    Base de Datos: Firebase Firestore (Colecciones /users)
                  </span>
                </div>
                <button
                  onClick={onForceSync}
                  className="px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 font-bold text-[11px] flex items-center gap-1"
                >
                  <RefreshCw size={11} className={syncStatus.isSyncing ? "animate-spin" : ""} />
                  <span>Sincronizar</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CELULAR & PAIRING QR */}
          {activeTab === "pairing" && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                  Escanea el Código QR desde tu Celular
                </h4>
                <p className="text-xs text-stone-500">
                  Abre la cámara de tu iPhone o Android para sincronizar al instante tu Ledger Maestro.
                </p>
              </div>

              {/* QR Code Graphic Container */}
              <div className="flex flex-col items-center justify-center p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-800">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Código QR de vinculación"
                    className="w-48 h-48 rounded-xl shadow-md border border-stone-100 dark:border-stone-700"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <RefreshCw size={24} className="animate-spin text-stone-400" />
                  </div>
                )}
                <div className="w-full mt-3 pt-2 border-t border-stone-200 dark:border-stone-700/60">
                  <div className="text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1 text-center">
                    Correo para sincronización:
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="usuario@gmail.com"
                      className="flex-1 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const clean = emailInput.trim().toLowerCase();
                        if (clean && clean.includes("@")) {
                          onChangeEmail(clean);
                          onForceSync();
                          playChime("success");
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs transition-transform active:scale-95"
                    >
                      Conectar
                    </button>
                  </div>
                </div>
              </div>

              {/* Share & Copy Link */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedLink ? "¡Enlace Copiado al Portapapeles!" : "Copiar Enlace para Celular"}</span>
                </button>

                <button
                  onClick={handleSendEmailDigest}
                  disabled={emailDigestStatus === "loading"}
                  className="py-2.5 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
                  title="Enviar resumen diario por correo"
                >
                  <Mail size={14} className="text-amber-500" />
                  <span className="hidden sm:inline">Enviar Resumen</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: APPLE APP REGISTRATION GUIDE */}
          {activeTab === "apple_setup" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/80 space-y-3">
                <div className="flex items-center gap-2">
                  <Apple size={18} className="text-stone-900 dark:text-stone-100" />
                  <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                    Registro de App de Apple en Firebase
                  </h4>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  Tu proyecto de Firebase actual es:{" "}
                  <code className="px-1.5 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700 font-mono font-bold text-amber-600 dark:text-amber-400">
                    gen-lang-client-0098696571
                  </code>
                  . Para registrar la aplicación de Apple (iOS / iPadOS / macOS) y conectar los servicios de autenticación y base de datos en tiempo real:
                </p>

                <ol className="space-y-2.5 text-xs text-stone-700 dark:text-stone-300 pl-2">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <strong className="text-stone-900 dark:text-stone-100">Abre Firebase Console:</strong>
                      <br />
                      Ingresa a{" "}
                      <a
                        href="https://console.firebase.google.com/project/gen-lang-client-0098696571/overview"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-600 dark:text-amber-400 font-semibold underline inline-flex items-center gap-1"
                      >
                        console.firebase.google.com/project/gen-lang-client-0098696571
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <strong className="text-stone-900 dark:text-stone-100">Registrar App de Apple:</strong>
                      <br />
                      En la página principal o Configuración del proyecto, haz clic en{" "}
                      <span className="font-semibold text-stone-900 dark:text-stone-100">"+ Añadir aplicación"</span> y selecciona el icono de{" "}
                      <strong>Apple (iOS)</strong>.
                    </div>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <strong className="text-stone-900 dark:text-stone-100">ID del paquete de Apple (Bundle ID):</strong>
                      <br />
                      Usa el ID de paquete recomendado:{" "}
                      <code className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 font-mono font-bold">
                        org.l.fgdll.taskos
                      </code>
                      {" "}(dominio asociado: <code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-stone-800 font-mono font-semibold">l.fgdll.org</code>).
                    </div>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      <strong className="text-stone-900 dark:text-stone-100">Descargar GoogleService-Info.plist:</strong>
                      <br />
                      Descarga el archivo generado e inclúyelo en la raíz de tu proyecto Xcode.
                    </div>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      5
                    </span>
                    <div>
                      <strong className="text-stone-900 dark:text-stone-100">Activar Proveedores de Sign-in en Consola:</strong>
                      <br />
                      Ve a <strong>Authentication &gt; Sign-in method</strong> y asegúrate de habilitar:
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px]">
                        <li><strong>Correo electrónico/contraseña</strong> (Email/Password)</li>
                        <li><strong>Teléfono</strong> (SMS authentication)</li>
                        <li><strong>Google</strong> (Ya pre-vinculado)</li>
                        <li><strong>Apple</strong> (Sign in with Apple)</li>
                      </ul>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 flex items-center justify-between text-xs text-stone-500">
          <span>Task-OS • Firebase en Tiempo Real</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
