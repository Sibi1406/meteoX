// hooks/useAuth.js — Authentication hook (Spec §5)
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { auth, googleProvider, signInWithPopup, signInAnonymously } from "../firebase";

export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined: loading, null: unauthenticated, object: user
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  async function loginWithGoogle() {
    setAuthError("");
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      return cred.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  }

  async function loginAsGuest() {
    setAuthError("");
    try {
      const cred = await signInAnonymously(auth);
      return cred.user;
    } catch (err) {
      // If anonymous auth is not enabled in Firebase console, allow client demo session
      console.warn("Firebase anonymous auth fallback to mock user:", err);
      const mockUser = {
        uid: `guest_${Date.now()}`,
        isAnonymous: true,
        displayName: "Guest Farmer",
      };
      setUser(mockUser);
      return mockUser;
    }
  }

  async function logout() {
    try {
      await fbSignOut(auth);
      setUser(null);
    } catch (err) {
      console.error("Sign out error", err);
    }
  }

  return {
    user,
    setUser,
    loading: user === undefined,
    authError,
    loginWithGoogle,
    loginAsGuest,
    logout,
  };
}
