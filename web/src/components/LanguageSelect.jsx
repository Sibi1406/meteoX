// components/LanguageSelect.jsx — Language switcher (Spec §23)
import { useLanguage } from "../i18n/LanguageContext";

export default function LanguageSelect() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="language-toggle">
      <button
        className={`lang-btn ${language === "en" ? "active" : ""}`}
        onClick={() => setLanguage("en")}
      >
        EN
      </button>
      <button
        className={`lang-btn ${language === "ta" ? "active" : ""}`}
        onClick={() => setLanguage("ta")}
      >
        தமிழ்
      </button>
    </div>
  );
}
