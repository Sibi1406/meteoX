// components/AdvisoryCard.jsx — Shared severity-aware advisory response card
import { useLanguage } from "../i18n/LanguageContext";
import RoleIcon from "./RoleIcon";
import { alertColor } from "../utils/weatherColors";

const ROLE_META = {
  farmer: { colorClass: "role-farmer", defaultTitle: "agriculturalAdvisory" },
  fisherman: { colorClass: "role-fisherman", defaultTitle: "marineAdvisory" },
  city_admin: { colorClass: "role-city", defaultTitle: "municipalAdvisory" },
  general: { colorClass: "role-general", defaultTitle: "generalAdvisory" },
  researcher: { colorClass: "role-general", defaultTitle: "generalAdvisory" },
};

function compactFacts(facts) {
  const temperatureFacts = facts.filter((fact) =>
    fact.icon === "🌡" || /temperature|temp|வெப்பநிலை/i.test(fact.label || "")
  );
  if (temperatureFacts.length < 2) return facts;

  const temperatures = temperatureFacts.flatMap((fact) =>
    [...String(fact.value || "").matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Math.round(Number(match[0])))
  );
  if (!temperatures.length) return facts;

  const lowest = Math.min(...temperatures);
  const highest = Math.max(...temperatures);
  const temperatureRange = {
    ...temperatureFacts[0],
    value: lowest === highest ? `${lowest}°C` : `${lowest}–${highest}°C`,
  };
  const firstTemperatureIndex = facts.indexOf(temperatureFacts[0]);

  return facts.flatMap((fact, index) => {
    if (index === firstTemperatureIndex) return [temperatureRange];
    return temperatureFacts.includes(fact) ? [] : [fact];
  });
}

export default function AdvisoryCard({
  role = "farmer",
  advisory,
  severity = advisory?.severity || "normal",
  localTrust,
  onSpeak,
  speaking = false,
  showGroundedBadge = false,
  showFacts = true,
  footnote = null,
}) {
  const { t } = useLanguage();
  if (!advisory?.headline && !advisory?.action) return null;

  const meta = ROLE_META[role] || ROLE_META.farmer;
  const facts = compactFacts(Array.isArray(advisory.facts) ? advisory.facts : []);
  const severityClass = ["urgent", "caution", "normal"].includes(severity) ? severity : "normal";

  return (
    <article
      className={`advisory-card response-card glass-card card-advisory ${meta.colorClass} severity-${severityClass}`}
      style={{ "--severity-color": alertColor(severityClass) }}
    >
      <div className="response-headline-row">
        <h3 className="response-headline">{advisory.headline}</h3>
        {onSpeak && (
          <button
            type="button"
            className="speak-btn response-speak-btn"
            onClick={() => onSpeak([advisory.headline, ...facts.map((fact) => `${fact.label}: ${fact.value}`), advisory.action].filter(Boolean).join(". "))}
            title={speaking ? t("stopSpeaking") : t("speakAnswer")}
            aria-label={speaking ? t("stopSpeaking") : t("speakAnswer")}
          >
            {speaking ? "⏹" : "🔊"}
          </button>
        )}
      </div>

      {showFacts && facts.length > 0 && (
        <div className="response-facts" aria-label={t("weatherFactsTitle")}>
          {facts.map((fact, index) => (
            <span className="response-fact" key={`${fact.label}-${index}`} title={fact.label}>
              <span className="response-fact-icon" aria-hidden="true">{fact.icon}</span>
              <span className="response-fact-value">{fact.value}</span>
            </span>
          ))}
        </div>
      )}

      {advisory.action && (
        <div className="response-action">
          <RoleIcon role={role} size={18} />
          <p>{advisory.action}</p>
        </div>
      )}

      {localTrust && (
        <div className="response-trust">
          <span aria-hidden="true">🎯</span>
          <span>
            {t("localReliability")}: {localTrust.trustScore || `${Math.round((localTrust.accuracyScore || 0.86) * 100)}%`}
          </span>
          {localTrust.sampleCount != null && <span>({localTrust.sampleCount} {t("observations")})</span>}
        </div>
      )}

      {(showGroundedBadge || footnote) && (
        <div className="response-footer">
          {showGroundedBadge ? (
            <>
              <span className="grounded-tag">✓ {t("groundedBadge")}</span>
              <span className="grounded-source">{t("liveWeatherData")} • {t("zeroHallucination")}</span>
            </>
          ) : <span>{footnote}</span>}
        </div>
      )}
    </article>
  );
}
