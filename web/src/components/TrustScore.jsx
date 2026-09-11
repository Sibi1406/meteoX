// components/TrustScore.jsx — UI Local Forecast Reliability Indicator (Spec §42)
import { useLanguage } from "../i18n/LanguageContext";

export default function TrustScore({ trustData, clusterName = "Local Cluster" }) {
  const { t } = useLanguage();

  if (!trustData || trustData.sampleCount == null) {
    return (
      <div className="trust-card empty">
        <div className="trust-header">
          <span className="trust-icon">🎯</span>
          <span className="trust-title">{t("localReliability")}</span>
        </div>
        <div className="trust-insufficient">
          <p>{t("insufficientData")}</p>
          <span className="trust-count">0 {t("observationsCount")}</span>
        </div>
      </div>
    );
  }

  const sampleCount = trustData.sampleCount || trustData.totalFeedback || 0;
  const isInsufficient = sampleCount <= 5 || trustData.trustScore == null;
  const percentage = trustData.trustScore != null ? Math.round(trustData.trustScore * 100) : null;

  return (
    <div className="trust-card">
      <div className="trust-header">
        <div className="trust-title-group">
          <span className="trust-icon">🎯</span>
          <span className="trust-title">{t("localReliability")}</span>
        </div>
        {trustData.isDemo && (
          <span className="demo-badge">{t("demoDataBadge")}</span>
        )}
      </div>

      <div className="trust-body">
        {isInsufficient ? (
          <div className="trust-insufficient">
            <div className="trust-subtext">{t("insufficientData")}</div>
            <div className="trust-obs-pill">{sampleCount} {t("observationsCount")}</div>
          </div>
        ) : (
          <div className="trust-score-row">
            <div className="trust-percentage-circle">
              <span className="trust-value">{percentage}%</span>
            </div>
            <div className="trust-details">
              <div className="trust-status-text">
                {percentage >= 80 ? t("highConfidence") : t("moderateConfidence")}
              </div>
              <div className="trust-meta">
                {t("basedOn")} <strong>{sampleCount}</strong> {t("observations")} {clusterName ? `in ${clusterName}` : ""}
              </div>
              {trustData.regionalBias != null && trustData.regionalBias !== 0 && (
                <div className="trust-bias">
                  Bias: {trustData.regionalBias > 0 ? `+${trustData.regionalBias} (${t("modelBiasOver")})` : `${trustData.regionalBias} (${t("modelBiasUnder")})`}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="trust-footer">
        {t("selfCalibratingNote")}
      </div>
    </div>
  );
}
