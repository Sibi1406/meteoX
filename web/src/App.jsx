// App.jsx — MeteoX Application Shell & Responsive Controller
import { useState } from "react";
import { Routes, Route, NavLink, Navigate, Link } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useProfile } from "./hooks/useProfile";
import { useLanguage } from "./i18n/LanguageContext";
import { api } from "./api";
import { DISTRICT_COORDINATES } from "./components/LocationSelect";
import Login from "./components/Login";
import RoleSelect from "./components/RoleSelect";
import LanguageSelect from "./components/LanguageSelect";
import Loading from "./components/Loading";
import RoleIcon from "./components/RoleIcon";

import Home from "./pages/Home";
import ChatPage from "./pages/ChatPage";
import Profile from "./pages/Profile";

function DemoAdminRoute({ profile }) {
  const { t } = useLanguage();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleTriggerDemoAlert() {
    setLoading(true);
    try {
      const demoRes = await api.triggerDemoAlert({ alertType: "heavy_rain", role: profile?.role || "farmer", language: "en" });
      setResult(demoRes?.alert || null);
    } catch (err) {
      console.error("Demo alert error:", err);
      setResult({ error: "Unable to trigger demo alert." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page dashboard-page-wide">
      <div className="glass-card card-system demo-mode-panel" style={{ maxWidth: 640, margin: "32px auto" }}>
        <div className="demo-header"><span className="demo-icon">🧪</span><span className="demo-title">Admin Demo Trigger</span></div>
        <p className="demo-desc">This route is intentionally unlinked from the main app navigation.</p>
        <button className="btn-secondary demo-trigger-btn" onClick={handleTriggerDemoAlert} disabled={loading}>
          {loading ? "Triggering..." : "Trigger Simulated Alert"}
        </button>
        {result && (
          <div style={{ marginTop: 18 }}>
            {result.error ? <p>{result.error}</p> : <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2)}</pre>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading: authLoading, setUser, firebaseConfigMissing } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile(user);
  const { t } = useLanguage();

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="app-shell loading-shell">
        <Loading message={t("startingApp")} />
      </div>
    );
  }

  // 1. Unauthenticated state -> Beautiful Landing & Login screen
  if (!user) {
    return (
      <div className="app-shell landing-shell">
        {firebaseConfigMissing && (
          <div className="firebase-config-warning">
            Firebase is not configured yet. The app is running in demo mode. Add your Firebase values to web/.env to enable login and live cloud features.
          </div>
        )}
        <Login onLoggedIn={setUser} />
      </div>
    );
  }

  // 2. Authenticated but first-time onboarding needed -> Role & Location Select
  if (!profile || !profile.role) {
    return (
      <div className="app-shell onboarding-shell">
        <RoleSelect initialProfile={profile} onDone={updateProfile} />
      </div>
    );
  }

  const currentDistrictKey = profile.location?.district?.toLowerCase();
  const validDistrictKey = DISTRICT_COORDINATES[currentDistrictKey] ? currentDistrictKey : "tirunelveli";

  function handleQuickDistrictChange(e) {
    const key = e.target.value;
    const info = DISTRICT_COORDINATES[key];
    if (info) {
      updateProfile({
        location: {
          latitude: info.lat,
          longitude: info.lng,
          district: info.name,
          cluster: { clusterType: "district", clusterId: key, displayName: info.name },
        },
      });
    }
  }

  // 3. Main Application with Fluid Responsive Shell
  return (
    <div className="app-shell">
      {/* Responsive Top Application Bar */}
      <header className="topbar glass-card card-system">
        <div className="topbar-inner">
          {/* Brand Logo & Live Radar */}
          <Link to="/" className="brand-area">
            <div className="brand-title-row">
              <span className="brand-icon">🌾</span>
              <h1>{t("appName")}</h1>
            </div>
            <div className="brand-live-sub">
              <span className="status-live-dot"></span>
              <span className="live-sub-text">{t("liveWeatherData")}</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="desktop-nav">
            <NavLink to="/" className={({ isActive }) => `desktop-nav-link ${isActive ? "active" : ""}`}>
              <span className="d-icon">🏠</span>
              <span>{t("navHome")}</span>
            </NavLink>
            <NavLink to="/chat" className={({ isActive }) => `desktop-nav-link ${isActive ? "active" : ""}`}>
              <span className="d-icon">💬</span>
              <span>{t("navChat")}</span>
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `desktop-nav-link ${isActive ? "active" : ""}`}>
              <span className="d-icon">👤</span>
              <span>{t("navProfile")}</span>
            </NavLink>
          </nav>

          {/* Right Header Utilities: District Switcher, Role Badge, Language */}
          <div className="topbar-actions">
            {/* Quick District Selector */}
            <div className="topbar-district-picker" title="Quick Switch District">
              <span className="loc-pin">📍</span>
              <select
                value={validDistrictKey}
                onChange={handleQuickDistrictChange}
                aria-label="Select District"
              >
                {Object.entries(DISTRICT_COORDINATES).map(([k, d]) => (
                  <option key={k} value={k}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Role Pill */}
            <Link to="/profile" className="header-role-pill" title="Edit Profile & Role">
              <RoleIcon role={profile.role} size={16} />
              <span className="role-name">{t(profile.role)}</span>
            </Link>

            {/* Language Selector */}
            <LanguageSelect />
          </div>
        </div>
      </header>

      {/* Main Page View Router */}
      <main className="page-container">
        <Routes>
          <Route path="/" element={<Home profile={profile} />} />
          <Route path="/chat" element={<ChatPage profile={profile} />} />
          <Route path="/admin/demo" element={<DemoAdminRoute profile={profile} />} />
          <Route
            path="/profile"
            element={<Profile profile={profile} onUpdateProfile={updateProfile} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Mobile-first Bottom Navigation Bar */}
      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <span className="nav-icon">🏠</span>
          <span>{t("navHome")}</span>
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <span className="nav-icon">💬</span>
          <span>{t("navChat")}</span>
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          <span className="nav-icon">👤</span>
          <span>{t("navProfile")}</span>
        </NavLink>
      </nav>
    </div>
  );
}
