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
import { getMessaging, isSupported as isMessagingSupported } from "firebase/messaging";

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
export const analytics = getAnalytics(app);
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
