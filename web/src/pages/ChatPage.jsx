// pages/ChatPage.jsx — Multilingual grounded advisory chat page
import { useLanguage } from "../i18n/LanguageContext";
import Chat from "../components/Chat";

export default function ChatPage({ profile }) {
  const { t } = useLanguage();

  return (
    <div className="page chat-page">
      <div className="chat-page-header">
        <h2>{t("chatTitle")}</h2>
        <span className="chat-status-pill">
          {t("groundedMode")} • {t(profile?.role || "farmer")}
        </span>
      </div>
      <Chat profile={profile} />
    </div>
  );
}
