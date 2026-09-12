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
  apiKey: "AIzaSyDGJ3hRjh_KUrrenQozabfGw1Ci2hvWuQg",
  authDomain: "meteox-9d084.firebaseapp.com",
  projectId: "meteox-9d084",
  storageBucket: "meteox-9d084.firebasestorage.app",
  messagingSenderId: "95788592543",
  appId: "1:95788592543:web:099345fd45a427b6ce21aa",
  measurementId: "G-YTY3J7F7MB"
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
