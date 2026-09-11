// components/AdvisoryCard.jsx — Role-specific advisory card (Spec §23, §26)
import { useLanguage } from "../i18n/LanguageContext";

const ROLE_META = {
  farmer: { icon: "🌱", colorClass: "role-farmer", defaultTitle: "agriculturalAdvisory" },
  fisherman: { icon: "🎣", colorClass: "role-fisherman", defaultTitle: "marineAdvisory" },
  city_admin: { icon: "🏛️", colorClass: "role-city", defaultTitle: "municipalAdvisory" },
  general: { icon: "🏠", colorClass: "role-general", defaultTitle: "generalAdvisory" },
  researcher: { icon: "🔬", colorClass: "role-general", defaultTitle: "generalAdvisory" },
};

export default function AdvisoryCard({ role = "farmer", advisory, title = null }) {
  const { t } = useLanguage();
  if (!advisory) return null;

  const meta = ROLE_META[role] || ROLE_META.farmer;
  const headerTitle = title || t(meta.defaultTitle);

  const advisoryList = Array.isArray(advisory) ? advisory : [advisory];

  return (
    <div className={`advisory-card ${meta.colorClass}`}>
      <div className="advisory-header">
        <span className="advisory-icon">{meta.icon}</span>
        <span className="advisory-title">{headerTitle}</span>
      </div>

      <div className="advisory-content">
        {advisoryList.map((item, idx) => (
          <p key={idx} className="advisory-text">
            {item}
          </p>
        ))}
      </div>

      <div className="advisory-footnote">
        {t("advisoryFootnote")}
      </div>
    </div>
  );
}
