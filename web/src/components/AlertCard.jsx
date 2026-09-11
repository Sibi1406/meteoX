// components/AlertCard.jsx — Displays extreme weather threshold alerts (Spec §33, §34)
import { useLanguage } from "../i18n/LanguageContext";

export default function AlertCard({ alert }) {
  const { language, t } = useLanguage();
  if (!alert) return null;

  const isTamil = language === "ta";
  const title = isTamil ? alert.title?.split("/")[1]?.trim() || alert.title : alert.title?.split("/")[0]?.trim() || alert.title;
  const description = isTamil ? (alert.tamilDescription || alert.description) : alert.description;

  return (
    <div className={`alert-card severity-${alert.severity || "medium"}`}>
      <div className="alert-card-header">
        <span className="alert-badge">⚠️ {t("autoWeatherAlert")}</span>
        {alert.metric && <span className="alert-metric">{alert.metric}</span>}
      </div>

      <div className="alert-card-content">
        <h4 className="alert-title">{title}</h4>
        <p className="alert-desc">{description}</p>
      </div>

      <div className="alert-card-footer">
        <span>{t("disasterManagementNote")}</span>
      </div>
    </div>
  );
}
