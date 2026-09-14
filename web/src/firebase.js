// firebase.js — client SDK init. Fill these in from
// Firebase Console > Project settings > General > Your apps > Web app.
// See README.md "1. Firebase project setup" for exact steps.
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously,
  connectAuthEmulator 
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getMessaging, getToken, isSupported as isMessagingSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);
let analyticsInstance = null;
const isLocalhost = typeof window !== "undefined" && ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
if (!isLocalhost) {
  try {
    analyticsInstance = getAnalytics(app);
  } catch (error) {
    console.warn("Firebase analytics is unavailable in this browser session.", error);
  }
}
export const analytics = analyticsInstance;
export const auth = getAuth(app);
export const db = getFirestore(app);
// Match the region set in functions/index.js (setGlobalOptions).
export const functions = getFunctions(app, "asia-south1");
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signInAnonymously };

// Connect to emulators if explicitly configured via env
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true") {
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, "localhost", 8080);
  connectFunctionsEmulator(functions, "localhost", 5001);
}

export async function getMessagingIfSupported() {
  if (await isMessagingSupported()) return getMessaging(app);
  return null;
}

let messagingRegistrationPromise;

function logMessagingStatus(message) {
  if (import.meta.env.DEV) console.info(`[MeteoX messaging] ${message}`);
}

async function registerMessagingServiceWorker() {
  if (!messagingRegistrationPromise) {
    const config = new URLSearchParams({
      apiKey: firebaseConfig.apiKey || "",
      authDomain: firebaseConfig.authDomain || "",
      projectId: firebaseConfig.projectId || "",
      storageBucket: firebaseConfig.storageBucket || "",
      messagingSenderId: firebaseConfig.messagingSenderId || "",
      appId: firebaseConfig.appId || "",
    });
    messagingRegistrationPromise = navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${config.toString()}`
    );
  }
  return messagingRegistrationPromise;
}

export async function getFcmTokenIfSupported(userId) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { token: null, reason: "Browser notifications are unsupported" };
  }
  if (!("serviceWorker" in navigator)) {
    return { token: null, reason: "Service workers are unsupported" };
  }

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    logMessagingStatus("VAPID key is not configured");
    return { token: null, reason: "FCM VAPID key is not configured" };
  }

  if (!(await isMessagingSupported())) {
    return { token: null, reason: "Firebase Messaging is unsupported" };
  }

  let permission = Notification.permission;
  if (permission === "default") {
    const permissionRequestKey = userId
      ? `meteox_notification_permission_requested_${userId}`
      : null;
    if (permissionRequestKey && localStorage.getItem(permissionRequestKey) === "true") {
      return { token: null, reason: "Notification permission has not been granted" };
    }
    if (permissionRequestKey) localStorage.setItem(permissionRequestKey, "true");
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { token: null, reason: `Notification permission ${permission}` };
  }

  try {
    const messaging = await getMessagingIfSupported();
    if (!messaging) return { token: null, reason: "Firebase Messaging is unsupported" };
    const serviceWorkerRegistration = await registerMessagingServiceWorker();
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration });
    if (!token) return { token: null, reason: "FCM token was not returned" };
    logMessagingStatus("FCM registration token obtained");
    return { token, reason: "FCM token obtained" };
  } catch (error) {
    console.warn("[MeteoX messaging] FCM registration unavailable:", error.message);
    return { token: null, reason: "FCM token registration failed" };
  }
}
