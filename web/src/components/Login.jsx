// components/Login.jsx — Hero Landing & Multimodal Authentication Screen for MeteoX
import { useState, useRef } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageSelect from "./LanguageSelect";

export default function Login({ onLoggedIn }) {
  const { t } = useLanguage();
  const { loginWithGoogle, loginAsGuest } = useAuth();

  const [showAuthCard, setShowAuthCard] = useState(false);
  const [authMethod, setAuthMethod] = useState("guest"); // 'guest' | 'phone' | 'google'
  const [phone, setPhone] = useState("+91 ");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const recaptchaRef = useRef(null);
  const authCardRef = useRef(null);

  function ensureRecaptcha() {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
    return recaptchaRef.current;
  }

  function handleOpenAuth(method = "guest") {
    setAuthMethod(method);
    setShowAuthCard(true);
    setTimeout(() => {
      authCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  async function handleSendOtp() {
    setError("");
    setBusy(true);
    try {
      const verifier = ensureRecaptcha();
      const result = await signInWithPhoneNumber(auth, phone, verifier);
      setConfirmation(result);
    } catch (e) {
      console.warn("Phone OTP error:", e);
      setError("Could not send SMS OTP. You can continue with Google or Guest mode below.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    setError("");
    setBusy(true);
    try {
      const cred = await confirmation.confirm(otp);
      onLoggedIn(cred.user);
    } catch (e) {
      setError("Incorrect OTP code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setBusy(true);
    try {
      const user = await loginWithGoogle();
      onLoggedIn(user);
    } catch (e) {
      setError("Google Sign-In was cancelled or not enabled. You can use Guest mode.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGuestLogin() {
    setError("");
    setBusy(true);
    try {
      const user = await loginAsGuest();
      onLoggedIn(user);
    } catch (e) {
      setError("Guest login error: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="landing-page-container">
      {/* Background Animated Weather Blobs & Gradients */}
      <div className="landing-ambient-bg" aria-hidden="true">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Floating Weather Particle Accents */}
      <div className="weather-particle p-cloud-1">☁️</div>
      <div className="weather-particle p-sun-1">☀️</div>
      <div className="weather-particle p-rain-1">🌧️</div>
      <div className="weather-particle p-sprout-1">🌱</div>

      {/* Top Bar with Brand & Language Switcher */}
      <header className="landing-top-bar">
        <div className="landing-brand">
          <span className="brand-logo-icon">🌾</span>
          <span className="brand-title">MeteoX</span>
        </div>
        <LanguageSelect />
      </header>

      {/* Main Hero Section */}
      <main className="landing-hero-content">
        <div className="hero-glow-badge">
          <span className="badge-pulse"></span>
          <span>{t("landingBadge")}</span>
        </div>

        <h1 className="landing-main-title">
          Meteo<span className="gradient-text">X</span>
        </h1>

        <p className="landing-tamil-tagline">{t("landingTaglineTamil")}</p>
        <p className="landing-description">{t("landingTagline")}</p>

        {/* Feature Pills */}
        <div className="landing-feature-pills">
          <span className="pill">🌐 {t("featurePill1")}</span>
          <span className="pill">🤖 {t("featurePill2")}</span>
          <span className="pill">🎯 {t("featurePill3")}</span>
          <span className="pill">🌾 {t("featurePill4")}</span>
        </div>

        {/* Call to Actions */}
        <div className="landing-cta-group">
          <button
            className="btn-primary hero-cta-btn"
            onClick={() => handleOpenAuth("phone")}
          >
            🚀 {t("getStarted")}
          </button>
          <button
            className="btn-secondary hero-guest-btn"
            onClick={handleGuestLogin}
            disabled={busy}
          >
            ⚡ {t("exploreGuest")}
          </button>
        </div>

        {/* Interactive Feature Highlights / Preview Cards */}
        <div className="landing-preview-grid">
          <div className="landing-card-glass">
            <div className="card-glass-header">
              <span className="card-icon">📍</span>
              <span className="card-tag">Tirunelveli Cluster</span>
            </div>
            <div className="card-temp-row">
              <span className="card-temp">30°C</span>
              <span className="card-condition">🌧️ Live Radar Synced</span>
            </div>
            <div className="card-micro-bar">
              <div className="micro-bar-fill" style={{ width: "80%" }}></div>
            </div>
            <span className="card-footer-text">Verified Live Open-Meteo Feed</span>
          </div>

          <div className="landing-card-glass highlight-green">
            <div className="card-glass-header">
              <span className="card-icon">🌱</span>
              <span className="card-tag">{t("farmer")} Advisory</span>
            </div>
            <p className="card-advisory-quote">
              &ldquo;Delay fertilizer and pesticide application. High chance of nutrient runoff before evening rain.&rdquo;
            </p>
            <span className="card-footer-text">Powered by Google Gemini 3.6 Flash</span>
          </div>

          <div className="landing-card-glass">
            <div className="card-glass-header">
              <span className="card-icon">🎯</span>
              <span className="card-tag">{t("localReliability")}</span>
            </div>
            <div className="card-trust-row">
              <span className="trust-big-stat">86%</span>
              <span className="trust-stat-desc">{t("highConfidence")} (48 {t("observations")})</span>
            </div>
            <span className="card-footer-text">{t("selfCalibratingNote")}</span>
          </div>
        </div>

        {/* Authentication Card Section */}
        {showAuthCard && (
          <div className="landing-auth-modal" ref={authCardRef}>
            <div className="login-card glass-modal-card">
              <div className="auth-card-header">
                <div>
                  <h3>{t("signInToContinue")}</h3>
                  <p className="hint">{t("phoneSignInHint")}</p>
                </div>
                <button
                  className="auth-close-btn"
                  onClick={() => setShowAuthCard(false)}
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {/* Quick Choice Tabs */}
              <div className="auth-tabs">
                <button
                  className={`auth-tab ${authMethod === "phone" ? "active" : ""}`}
                  onClick={() => setAuthMethod("phone")}
                >
                  📱 Phone OTP
                </button>
                <button
                  className={`auth-tab ${authMethod === "google" ? "active" : ""}`}
                  onClick={() => setAuthMethod("google")}
                >
                  🌐 Google
                </button>
                <button
                  className={`auth-tab ${authMethod === "guest" ? "active" : ""}`}
                  onClick={() => setAuthMethod("guest")}
                >
                  ⚡ Instant Demo
                </button>
              </div>

              {/* Phone OTP Auth */}
              {authMethod === "phone" && (
                <div>
                  {!confirmation ? (
                    <div className="phone-auth-group">
                      <div className="field">
                        <label>{t("phoneNumber")}</label>
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          inputMode="tel"
                        />
                      </div>
                      <button className="btn-primary" onClick={handleSendOtp} disabled={busy}>
                        {busy ? t("sendingCode") : t("sendCode")}
                      </button>
                    </div>
                  ) : (
                    <div className="phone-auth-group">
                      <div className="field">
                        <label>{t("enterOtp")}</label>
                        <input
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="123456"
                          inputMode="numeric"
                        />
                      </div>
                      <button className="btn-primary" onClick={handleVerifyOtp} disabled={busy}>
                        {busy ? t("verifying") : t("verifyOtp")}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Google Auth */}
              {authMethod === "google" && (
                <div className="google-auth-box">
                  <p className="auth-subtext">Sign in securely using your Google account to sync preferences across devices.</p>
                  <button className="btn-google" onClick={handleGoogleLogin} disabled={busy}>
                    <svg className="google-icon" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.24 21.28 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.24 2.72 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    {t("signInWithGoogle")}
                  </button>
                </div>
              )}

              {/* Instant Guest / Demo Mode */}
              {authMethod === "guest" && (
                <div className="guest-auth-box">
                  <p className="auth-subtext">Access MeteoX instantly with live Open-Meteo feeds, Google Gemini 3.6 Flash advisories, and local calibration without entering credentials.</p>
                  <button className="btn-primary guest-action-btn" onClick={handleGuestLogin} disabled={busy}>
                    🚀 {t("guestSignIn")}
                  </button>
                </div>
              )}

              {error && <p className="error-text">{error}</p>}
              <div id="recaptcha-container" />
            </div>
          </div>
        )}

        <footer className="landing-footer">
          <p>{t("trustedBy")}</p>
        </footer>
      </main>
    </div>
  );
}
