// components/AdvisoryCard.jsx — Role-specific advisory card
import { useLanguage } from "../i18n/LanguageContext";
import RoleIcon from "./RoleIcon";

const ROLE_META = {
  farmer: { colorClass: "role-farmer", defaultTitle: "agriculturalAdvisory" },
  fisherman: { colorClass: "role-fisherman", defaultTitle: "marineAdvisory" },
  city_admin: { colorClass: "role-city", defaultTitle: "municipalAdvisory" },
  general: { colorClass: "role-general", defaultTitle: "generalAdvisory" },
  researcher: { colorClass: "role-general", defaultTitle: "generalAdvisory" },
};

export default function AdvisoryCard({ role = "farmer", advisory, title = null }) {
  const { t } = useLanguage();
  if (!advisory) return null;

  const meta = ROLE_META[role] || ROLE_META.farmer;
  const headerTitle = title || t(meta.defaultTitle);
  const advisoryList = Array.isArray(advisory) ? advisory : [advisory];

  return (
    <div className={`advisory-card ${meta.colorClass}`}>
      <div className="advisory-header" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <RoleIcon role={role} size={22} />
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
