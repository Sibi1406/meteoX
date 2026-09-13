// hooks/useAuth.js — Authentication hook (Spec §5)
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { auth, googleProvider, signInWithPopup, signInAnonymously } from "../firebase";

export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined: loading, null: unauthenticated, object: user
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fallbackTimer = window.setTimeout(() => {
      if (isMounted) {
        setUser(null);
      }
    }, 2000);

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (!isMounted) return;
        setUser(currentUser ?? null);
        window.clearTimeout(fallbackTimer);
      },
      (error) => {
        console.warn("Firebase auth initialization failed; falling back to guest mode.", error);
        if (isMounted) {
          setUser(null);
        }
        window.clearTimeout(fallbackTimer);
      }
    );

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
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
      setAuthError(err.message);
      throw err;
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
