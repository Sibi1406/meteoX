// components/RoleSelect.jsx — User onboarding: role selection & location setup (Spec §6, §7)
import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import LocationSelect from "./LocationSelect";
import LanguageSelect from "./LanguageSelect";
import RoleIcon from "./RoleIcon";

const ROLES = [
  { id: "farmer", labelKey: "farmer", descKey: "farmerDesc" },
  { id: "fisherman", labelKey: "fisherman", descKey: "fishermanDesc" },
  { id: "city_admin", labelKey: "cityAdmin", descKey: "cityAdminDesc" },
  { id: "general", labelKey: "general", descKey: "generalDesc" },
  { id: "researcher", labelKey: "researcher", descKey: "researcherDesc" },
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
      {/* Onboarding Header with Step Indicator */}
      <div className="onboarding-top">
        <div className="onboarding-step-indicator" style={{ width: "100%" }}>
          <div className="step-badge-row">
            <span className="step-badge">
              {t("stepIndicator")} 1 {t("of")} 2
            </span>
            <LanguageSelect />
          </div>
          <div className="step-progress-track">
            <div className="step-progress-bar" style={{ width: "65%" }}></div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "4px" }}>
        <h2>{t("selectRoleTitle")}</h2>
        <p className="hint">{t("selectRoleHint")}</p>
      </div>

      {/* Role Cards Grid with duotone icons and clear selected state */}
      <div className="role-grid">
        {ROLES.map((r) => {
          const isSelected = role === r.id;
          return (
            <button
              key={r.id}
              className={`role-option-card ${isSelected ? "selected" : ""}`}
              onClick={() => setRole(r.id)}
              aria-pressed={isSelected}
            >
              <div className="role-icon-container">
                <RoleIcon role={r.id} size={26} />
              </div>
              <div className="role-info">
                <div className="role-label">{t(r.labelKey)}</div>
                <div className="role-desc">{t(r.descKey)}</div>
              </div>
              <div className="role-check-indicator" aria-hidden="true">
                ✓
              </div>
            </button>
          );
        })}
      </div>

      {/* Location Selector (Step 2 section) */}
      <div className="onboarding-location-section">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span className="step-badge">{t("stepIndicator")} 2 {t("of")} 2</span>
          <h3 style={{ margin: 0 }}>📍 {t("locationTitle")}</h3>
        </div>
        <LocationSelect currentLocation={location} onSelect={setLocation} />
      </div>

      <button className="btn-primary continue-btn" onClick={handleContinue} disabled={busy}>
        {busy ? t("saving") : t("continue")}
      </button>
    </div>
  );
}
