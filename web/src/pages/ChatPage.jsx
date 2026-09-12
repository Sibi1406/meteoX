// pages/ChatPage.jsx — Multilingual advisory chat page for MeteoX
import { useLanguage } from "../i18n/LanguageContext";
import Chat from "../components/Chat";
import RoleIcon from "../components/RoleIcon";

export default function ChatPage({ profile }) {
  const { t } = useLanguage();
  const role = profile?.role || "farmer";

  return (
    <div className="page chat-page">
      <div className="chat-page-header">
        <h2>{t("chatTitle")}</h2>
        <span className="chat-status-pill" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <RoleIcon role={role} size={16} />
          <span>{t(role)} {t("roleModeSuffix")}</span>
        </span>
      </div>
      <Chat profile={profile} />
    </div>
  );
}
