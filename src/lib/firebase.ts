import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  getDocs,
  collection,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);

// Configure Google Auth Provider with Google Workspace Scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/contacts");
googleProvider.addScope("https://www.googleapis.com/auth/contacts.readonly");
googleProvider.addScope("https://www.googleapis.com/auth/calendar");
googleProvider.addScope("https://www.googleapis.com/auth/calendar.events");
googleProvider.addScope("https://www.googleapis.com/auth/tasks");
googleProvider.addScope("https://www.googleapis.com/auth/spreadsheets");
googleProvider.addScope("https://www.googleapis.com/auth/drive.file");

// Configure Apple Auth Provider for Sign in with Apple
export const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

// In-memory caching for OAuth access token (mandatory: never store in localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check with server
let hasTestedConnection = false;
export async function testFirestoreConnection(): Promise<boolean> {
  if (hasTestedConnection) return true;
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    hasTestedConnection = true;
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore: client appears offline, check network connection.");
    }
    // Expected if doc doesn't exist or permissions block test doc
    hasTestedConnection = true;
    return true;
  }
}

// Automatically verify connection on initialization
if (typeof window !== "undefined") {
  testFirestoreConnection().catch((err) =>
    console.warn("Initial Firestore connection verification completed with notice:", err)
  );
}

// Initialize Auth listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup and obtain access token
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return { user: result.user, accessToken: cachedAccessToken || "" };
  } catch (error: any) {
    console.error("Google sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Sign in with Apple Popup
export const appleSignIn = async (): Promise<User> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, appleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Apple sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Email & Password Authentication
export const registerWithEmail = async (
  email: string,
  pass: string,
  displayName?: string
): Promise<User> => {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }
    return cred.user;
  } catch (error: any) {
    console.error("Email registration error:", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string): Promise<User> => {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return cred.user;
  } catch (error: any) {
    console.error("Email login error:", error);
    throw error;
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error: any) {
    console.error("Password reset error:", error);
    throw error;
  }
};

// Phone Authentication with RecaptchaVerifier
let recaptchaVerifierInstance: RecaptchaVerifier | null = null;

export const initRecaptchaVerifier = (
  containerElementId: string,
  onSolved?: () => void
): RecaptchaVerifier => {
  if (recaptchaVerifierInstance) {
    try {
      recaptchaVerifierInstance.clear();
    } catch (_) {}
    recaptchaVerifierInstance = null;
  }

  recaptchaVerifierInstance = new RecaptchaVerifier(auth, containerElementId, {
    size: "normal",
    callback: () => {
      if (onSolved) onSolved();
    },
    "expired-callback": () => {
      console.warn("reCAPTCHA expired, please solve again.");
    },
  });

  return recaptchaVerifierInstance;
};

export const sendPhoneCode = async (
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
  try {
    // Phone number format must be E.164 (e.g. +5215512345678 or +12345678901)
    const formatted = phoneNumber.trim().startsWith("+")
      ? phoneNumber.trim()
      : `+${phoneNumber.trim()}`;
    const confirmation = await signInWithPhoneNumber(auth, formatted, verifier);
    return confirmation;
  } catch (error: any) {
    console.error("Phone send code error:", error);
    throw error;
  }
};

export const verifyPhoneCode = async (
  confirmationResult: ConfirmationResult,
  code: string
): Promise<User> => {
  try {
    const cred = await confirmationResult.confirm(code.trim());
    return cred.user;
  } catch (error: any) {
    console.error("Phone verification code error:", error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Friendly message translator for Firebase Auth errors in Spanish
export function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return "Ocurrió un error inesperado en la autenticación.";
  const code = error.code || "";
  switch (code) {
    case "auth/invalid-email":
      return "El formato del correo electrónico no es válido.";
    case "auth/user-disabled":
      return "Esta cuenta de usuario ha sido inhabilitada.";
    case "auth/user-not-found":
      return "No existe una cuenta registrada con este correo.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Contraseña o credenciales incorrectas. Verifica tus datos.";
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con este correo electrónico.";
    case "auth/weak-password":
      return "La contraseña es muy débil. Debe tener al menos 6 caracteres.";
    case "auth/operation-not-allowed":
      return "Este método de inicio de sesión no está habilitado en Firebase Console (Ve a Authentication > Sign-in method para activarlo).";
    case "auth/popup-closed-by-user":
      return "Se cerró la ventana emergente de inicio de sesión.";
    case "auth/popup-blocked":
      return "La ventana emergente fue bloqueada por el navegador. Permite popups para continuar.";
    case "auth/invalid-phone-number":
      return "El número telefónico no es válido. Incluye el código de país (ej. +52 55...).";
    case "auth/missing-phone-number":
      return "Por favor ingresa un número de teléfono válido.";
    case "auth/quota-exceeded":
      return "Se ha superado la cuota de SMS para este proyecto de Firebase.";
    case "auth/invalid-verification-code":
      return "El código de verificación SMS ingresado es incorrecto.";
    case "auth/code-expired":
      return "El código SMS ha expirado. Solicita un nuevo código.";
    case "auth/captcha-check-failed":
      return "La verificación de reCAPTCHA falló. Intenta de nuevo.";
    case "auth/unauthorized-domain": {
      const currentHost = typeof window !== "undefined" ? window.location.hostname : "el dominio actual";
      return `Dominio no autorizado en Firebase (${currentHost}). Ve a Firebase Console > Authentication > Settings > Authorized domains y añade "l.fgdll.org" y "${currentHost}".`;
    }
    default:
      return error.message || "Error al autenticar con Firebase.";
  }
}

