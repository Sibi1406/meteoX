// pages/Profile.jsx — User profile management screen (Spec Item 8)
import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { useAuth } from "../hooks/useAuth";
import LocationSelect from "../components/LocationSelect";
import LanguageSelect from "../components/LanguageSelect";
import RoleIcon from "../components/RoleIcon";

const ROLES = [
  { id: "farmer", labelKey: "farmer" },
  { id: "fisherman", labelKey: "fisherman" },
  { id: "city_admin", labelKey: "cityAdmin" },
  { id: "general", labelKey: "general" },
  { id: "researcher", labelKey: "researcher" },
];

export default function Profile({ profile, onUpdateProfile }) {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const [role, setRole] = useState(profile?.role || "farmer");
  const [location, setLocation] = useState(profile?.location || {});
  const [savedMessage, setSavedMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSavedMessage("");
    try {
      await onUpdateProfile({
        role,
        location,
      });
      setSavedMessage(t("profileUpdated"));
    } catch (err) {
      console.error("Save profile error:", err);
    } finally {
      setSaving(false);
    }
  }

  const isGuest = user?.isAnonymous || !user;
  const userIdentifier = isGuest
    ? t("guestSession")
    : user.phoneNumber || user.email || (user.uid ? `ID: ${user.uid.slice(0, 8)}...` : t("guestSession"));

  return (
    <div className="page profile-page">
      <div className="profile-header">
        <h2>{t("navProfile")}</h2>
        <LanguageSelect />
      </div>

      <div className="profile-card">
        {/* User Session Badge with friendly label (Spec Item 8) */}
        <div className="user-id-badge">
          <span>{userIdentifier}</span>
          {isGuest && <span className="demo-tag">{t("guestMode")}</span>}
        </div>

        {/* Role Selector with unified Duotone Icons */}
        <div className="profile-field-group">
          <label className="group-label">{t("selectRoleTitle")}</label>
          <div className="role-mini-grid">
            {ROLES.map((r) => (
              <button
                key={r.id}
                className={`role-mini-chip ${role === r.id ? "selected" : ""}`}
                onClick={() => setRole(r.id)}
              >
                <RoleIcon role={r.id} size={18} />
                <span>{t(r.labelKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Location Selector */}
        <div className="profile-field-group">
          <label className="group-label">{t("locationTitle")}</label>
          <LocationSelect currentLocation={location} onSelect={setLocation} />
          <div className="coords-display">
            Lat: {location.latitude || "—"}, Lng: {location.longitude || "—"} (
            {location.district || "—"})
          </div>
        </div>

        {/* Delivery Channels with 'Not yet connected' status (Spec Item 8) */}
        <div className="profile-field-group">
          <label className="group-label">{t("deliveryChannels")}</label>
          <div className="channels-list">
            <div className="channel-item active">
              <span>📱 PWA Push Notifications</span>
              <span className="channel-status">Active</span>
            </div>
            <div className="channel-item stub">
              <span>💬 WhatsApp Alerts</span>
              <span className="channel-status" style={{ background: "rgba(188, 221, 220, 0.08)", color: "var(--text-muted)" }}>
                {t("notConnected")}
              </span>
            </div>
            <div className="channel-item stub">
              <span>✉️ SMS Fallback</span>
              <span className="channel-status" style={{ background: "rgba(188, 221, 220, 0.08)", color: "var(--text-muted)" }}>
                {t("notConnected")}
              </span>
            </div>
          </div>
        </div>

        {savedMessage && <p className="success-msg">{savedMessage}</p>}

        <div className="profile-actions">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? t("saving") : t("saveChanges")}
          </button>
          <button className="btn-secondary signout-btn" onClick={logout}>
            {t("signOut")}
          </button>
        </div>
      </div>
    </div>
  );
}
