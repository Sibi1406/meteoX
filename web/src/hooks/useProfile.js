// hooks/useProfile.js — User profile hook (Spec §6)
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, getFcmTokenIfSupported } from "../firebase";
import { api } from "../api";

export const DEFAULT_LOCATION = {
  latitude: 8.7139,
  longitude: 77.7567,
  district: "Tirunelveli",
  cluster: { clusterType: "district", clusterId: "tirunelveli", displayName: "Tirunelveli" },
};

export function useProfile(user) {
  const [profile, setProfile] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = window.localStorage.getItem("weathergpt_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.location?.district === "Coimbatore" && !window.localStorage.getItem("weathergpt_explicit_coimbatore")) {
          parsed.location = DEFAULT_LOCATION;
        }
        return parsed;
      }
    } catch (e) {
      console.warn("Failed to parse cached profile:", e);
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isMounted = true;
    async function loadFirestoreProfile() {
      setLoading(true);
      let loadedProfile = profile || null;
      try {
        if (!user.uid.startsWith("guest_")) {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists() && isMounted) {
            const data = snap.data();
            loadedProfile = data;
            setProfile(data);
            localStorage.setItem("weathergpt_profile", JSON.stringify(data));
          }
        }

        if (auth.currentUser?.uid !== user.uid) return;
        const registration = await getFcmTokenIfSupported(user.uid);
        if (registration.token && registration.token !== loadedProfile?.fcmToken && isMounted) {
          await api.createUserProfile({ fcmToken: registration.token });
          setProfile((current) => ({ ...(current || loadedProfile || {}), fcmToken: registration.token }));
          localStorage.setItem(
            "weathergpt_profile",
            JSON.stringify({ ...(loadedProfile || {}), fcmToken: registration.token })
          );
        }
      } catch (err) {
        console.warn("Could not load profile from Firestore:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFirestoreProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

  async function updateProfile(newFields) {
    if (newFields?.location?.district === "Coimbatore") {
      localStorage.setItem("weathergpt_explicit_coimbatore", "true");
    }

    const updated = {
      ...(profile || {
        role: "farmer",
        preferredLanguage: "en",
        location: DEFAULT_LOCATION,
      }),
      ...newFields,
      updatedAt: new Date().toISOString(),
    };

    setProfile(updated);
    localStorage.setItem("weathergpt_profile", JSON.stringify(updated));

    if (user) {
      try {
        await api.createUserProfile({
          role: updated.role,
          preferredLanguage: updated.preferredLanguage,
          location: updated.location,
          district: updated.location?.district,
          channels: updated.channels,
          fcmToken: updated.fcmToken,
        });
      } catch (err) {
        console.warn("Could not sync profile to backend:", err);
      }
    }
    return updated;
  }

  return {
    profile,
    loading,
    updateProfile,
    setProfile,
  };
}
