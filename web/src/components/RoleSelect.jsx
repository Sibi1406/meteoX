// components/RoleSelect.jsx — User onboarding: role selection & location setup (Spec §6, §7)
import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import LocationSelect from "./LocationSelect";
import LanguageSelect from "./LanguageSelect";

const ROLES = [
  { id: "farmer", emoji: "🌾", labelKey: "farmer", descKey: "farmerDesc" },
  { id: "fisherman", emoji: "🎣", labelKey: "fisherman", descKey: "fishermanDesc" },
  { id: "city_admin", emoji: "🏛️", labelKey: "cityAdmin", descKey: "cityAdminDesc" },
  { id: "general", emoji: "🏠", labelKey: "general", descKey: "generalDesc" },
  { id: "researcher", emoji: "🔬", labelKey: "researcher", descKey: "researcherDesc" },
];

export default function RoleSelect({ initialProfile, onDone }) {
  const { t } = useLanguage();
  const [role, setRole] = useState(initialProfile?.role || "farmer");
  const [location, setLocation] = useState(
    initialProfile?.location || {
      latitude: 8.7139,
      longitude: 77.7567,
      district: "Tirunelveli",
      cluster: { clusterType: "district", clusterId: "tirunelveli", displayName: "Tirunelveli" },
    }
  );
  const [busy, setBusy] = useState(false);

  async function handleContinue() {
    setBusy(true);
    try {
      await onDone({
        role,
        location,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="onboarding-screen screen">
      <div className="onboarding-top">
        <h2>{t("selectRoleTitle")}</h2>
        <LanguageSelect />
      </div>
      <p className="hint">{t("selectRoleHint")}</p>

      {/* Role Cards Grid */}
      <div className="role-grid">
        {ROLES.map((r) => (
          <button
            key={r.id}
            className={`role-option-card ${role === r.id ? "selected" : ""}`}
            onClick={() => setRole(r.id)}
          >
            <div className="role-emoji">{r.emoji}</div>
            <div className="role-info">
              <div className="role-label">{t(r.labelKey)}</div>
              <div className="role-desc">{t(r.descKey)}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Location Selector */}
      <div className="onboarding-location-section">
        <h3>📍 {t("locationTitle")}</h3>
        <LocationSelect currentLocation={location} onSelect={setLocation} />
      </div>

      <button className="btn-primary continue-btn" onClick={handleContinue} disabled={busy}>
        {busy ? t("saving") : t("continue")}
      </button>
    </div>
  );
}
