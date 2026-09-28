// components/DriftChip.jsx — Displays material forecast drift for tomorrow (Spec Section 3)
import { useLanguage } from "../i18n/LanguageContext";

export default function DriftChip({ drift, isTamil = false }) {
  const { t } = useLanguage();

  if (!drift || drift.delta == null) {
    return null;
  }

  const timeStr = (() => {
    if (!drift.sinceISO) return "";
    const d = new Date(drift.sinceISO);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleTimeString(isTamil ? "ta-IN" : "en-US", {
          timeZone: "Asia/Kolkata",
          hour: "numeric",
          minute: "2-digit",
        });
  })();

  const isRise = drift.direction === "rise" || drift.delta > 0;
  const absDelta = Math.abs(drift.delta);

  const text = isRise
    ? t("driftRose")
        .replace("{from}", drift.from)
        .replace("{to}", drift.to)
        .replace("{time}", timeStr || "earlier")
    : t("driftFell")
        .replace("{from}", drift.from)
        .replace("{to}", drift.to)
        .replace("{time}", timeStr || "earlier");

  return (
    <div
      className={`drift-chip-container ${isRise ? "drift-rise" : "drift-fall"}`}
      role="status"
      aria-label={text}
    >
      <span className="drift-icon" aria-hidden="true">
        {isRise ? "↗" : "↘"}
      </span>
      <span className="drift-badge">
        {isRise ? `+${absDelta}%` : `-${absDelta}%`}
      </span>
      <span className="drift-text">{text}</span>
    </div>
  );
}
