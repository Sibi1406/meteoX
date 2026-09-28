// components/TrackRecordGrid.jsx — 30-Day Self-Grading Forecast Grid (Spec Section 2, Section 6)
import { useLanguage } from "../i18n/LanguageContext";
import weatherThresholds from "../../../functions/lib/weatherThresholds.json";

function formatTileAria(day, isTamil = false) {
  if (!day) return "";
  const dateStr = day.date
    ? new Date(`${day.date}T00:00:00`).toLocaleDateString(isTamil ? "ta-IN" : "en-US", {
        day: "numeric",
        month: "short",
        timeZone: "Asia/Kolkata",
      })
    : "Day";

  const forecastText = day.predictedRain
    ? isTamil ? "மழை கணிக்கப்பட்டது" : "forecast rain"
    : isTamil ? "வறண்ட வானிலை கணிக்கப்பட்டது" : "forecast dry";

  const actualText = day.rained
    ? isTamil ? "மழை பெய்தது" : "it rained"
    : isTamil ? "மழை பெய்யவில்லை" : "it stayed dry";

  const resultText = day.hit
    ? isTamil ? "சரி" : "correct"
    : isTamil ? "தவறு" : "miss";

  const sourceText = day.source === "farmer"
    ? isTamil ? "விவசாயி உறுதி" : "farmer verified"
    : isTamil ? "மாதிரி பகுப்பாய்வு" : "model analysis";

  return `${dateStr}: ${forecastText}, ${actualText}, ${resultText} ${sourceText}`.trim();
}

export default function TrackRecordGrid({
  trackRecord,
  isTamil = false,
  clusterName = "Local District",
  trustScore = null,
  rainDayMm = weatherThresholds.RAIN_DAY_MM,
}) {
  const { t } = useLanguage();

  const days = trackRecord?.days || [];
  const hasVerifiedDays = days.length > 0;
  const isDemo = Boolean(trackRecord?.isDemo);

  const hits = trackRecord?.hits ?? trackRecord?.autoHits ?? 0;
  const total = trackRecord?.total ?? trackRecord?.autoTotal ?? 0;
  const pct = trackRecord?.hitRate != null
    ? trackRecord.hitRate
    : total > 0 ? Math.round((hits / total) * 100) : 0;
  const windowDays = trackRecord?.windowDays || 30;

  const headline = t("trackRecordHeadline")
    .replace("{hits}", hits)
    .replace("{total}", total)
    .replace("{pct}", pct);

  const subline = t("trackRecordInDistrict")
    .replace("{district}", clusterName)
    .replace("{windowDays}", windowDays);

  return (
    <div className="track-record-card glass-card card-system">
      <div className="track-record-header">
        <div className="track-record-title-group">
          <span className="track-record-icon" aria-hidden="true">🎯</span>
          <div>
            <h4>{t("trackRecordTitle")}</h4>
            <span className="track-record-subline">{subline}</span>
          </div>
        </div>
        <div className="header-badges-group">
          {isDemo && (
            <span className="demo-badge">{t("demoDataBadge")}</span>
          )}
        </div>
      </div>

      {!hasVerifiedDays ? (
        <div className="track-record-empty">
          <p className="empty-text">⏳ {t("trackRecordEmpty")}</p>
        </div>
      ) : (
        <>
          <div className="track-record-headline-box">
            <div className="headline-main">{headline}</div>
          </div>

          <div
            className="track-record-grid"
            role="grid"
            aria-label={`${t("trackRecordTitle")} - ${headline}`}
          >
            {days.map((day, idx) => {
              const ariaLabel = formatTileAria(day, isTamil);
              const isHit = Boolean(day.hit);
              const isFarmer = day.source === "farmer";

              return (
                <div
                  key={`${day.date}-${idx}`}
                  className={`track-tile ${isHit ? "tile-hit" : "tile-miss"} ${isFarmer ? "tile-farmer-ring" : ""}`}
                  tabIndex={0}
                  role="gridcell"
                  aria-label={ariaLabel}
                  title={ariaLabel}
                >
                  <span className="tile-glyph" aria-hidden="true">
                    {isHit ? "✓" : "×"}
                  </span>
                  <span className={`tile-source ${isFarmer ? "source-farmer" : "source-model"}`} aria-hidden="true">
                    {isFarmer ? "F" : "M"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="track-record-legend">
            <span className="legend-item">
              <span className="legend-swatch hit-swatch">✓</span> {t("trackRecordHit")}
            </span>
            <span className="legend-item">
              <span className="legend-swatch miss-swatch">×</span> {t("trackRecordMiss")}
            </span>
            <span className="legend-item">
              <span className="legend-swatch farmer-ring-swatch">◯</span> {t("farmerConfirmed")}
            </span>
            <span className="legend-item"><strong>M</strong> {t("modelAnalysisSource")}</span>
          </div>
        </>
      )}

      {trustScore && trustScore.trustScore != null && (
        <div className="track-record-trust-pill">
          <span>{t("localReliability")}: {Math.round(trustScore.trustScore * 100)}%</span>
          <span className="sample-badge">({trustScore.sampleCount || 0} {t("observations")})</span>
        </div>
      )}

      <div className="track-record-footnote">
        ℹ️ {t("trackRecordFootnote").replace("{threshold}", Number(rainDayMm).toFixed(1))}
      </div>
    </div>
  );
}
