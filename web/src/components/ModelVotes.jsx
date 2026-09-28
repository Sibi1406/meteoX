// components/ModelVotes.jsx — Multi-Model Agreement Visualization (Spec Section 1, Section 6)
import { useLanguage } from "../i18n/LanguageContext";

export default function ModelVotes({ modelAgreement, isTamil = false }) {
  const { t } = useLanguage();

  if (!modelAgreement || !Array.isArray(modelAgreement.models) || modelAgreement.models.length === 0) {
    return (
      <div className="model-votes-card glass-card card-data">
        <div className="model-votes-header">
          <span className="model-votes-icon">📡</span>
          <h4>{t("modelAgreementTitle")}</h4>
        </div>
        <div className="model-votes-empty">
          <span className="single-model-badge">ℹ️ {t("singleModelForecast")}</span>
        </div>
      </div>
    );
  }

  const { models, rainVotes, of, level, spreadMm } = modelAgreement;

  // Use percent axis only if all models have non-null rainProbability
  const allHaveProb = models.every((m) => m.rainProbability != null);
  const maxMm = 10;

  const verdictText = (() => {
    if (level === "agree_rain") {
      return t("modelAgreeRain").replace("{votes}", rainVotes).replace("{of}", of);
    }
    if (level === "agree_dry") {
      return t("modelAgreeDry").replace("{votes}", rainVotes).replace("{of}", of);
    }
    return t("modelSplit")
      .replace("{votes}", rainVotes)
      .replace("{of}", of)
      .replace("{spread}", spreadMm ?? 0);
  })();

  const levelClass =
    level === "agree_rain"
      ? "level-agree-rain"
      : level === "agree_dry"
        ? "level-agree-dry"
        : "level-split";

  return (
    <div className={`model-votes-card glass-card card-data ${levelClass}`}>
      <div className="model-votes-header">
        <div className="model-votes-title-group">
          <span className="model-votes-icon">🌐</span>
          <div>
            <h4>{t("modelAgreementTitle")}</h4>
            <p className="model-votes-sub">{t("modelAgreementSub")}</p>
          </div>
        </div>
        <span className={`agreement-pill ${levelClass}`}>
          {rainVotes} / {of} {t("votesRain")}
        </span>
      </div>

      <div className="model-votes-verdict" role="status">
        <span className="verdict-glyph">
          {level === "agree_rain" ? "🌧️" : level === "agree_dry" ? "☀️" : "⚖️"}
        </span>
        <p>{verdictText}</p>
      </div>

      <div className="model-bars-container" aria-label={t("modelVotesTitle")}>
        {models.map((m) => {
          const axisValue = allHaveProb ? m.rainProbability : m.rainMm;
          const percentWidth = axisValue == null
            ? 50
            : allHaveProb
              ? Math.max(0, Math.min(100, axisValue))
              : Math.max(0, Math.min(100, Math.round((axisValue / maxMm) * 100)));

          const voteLabel = m.votesRain == null
            ? t("modelVoteUnknown")
            : m.votesRain ? t("modelVoteRain") : t("modelVoteDry");
          const ariaText = t("modelDataAria")
            .replace("{model}", m.label)
            .replace("{rainfall}", m.rainMm ?? "--")
            .replace("{probability}", m.rainProbability == null ? "--" : `${m.rainProbability}%`)
            .replace("{vote}", voteLabel);
          const voteClass = m.votesRain == null
            ? "model-votes-unknown"
            : m.votesRain ? "model-votes-rain" : "model-votes-dry";

          return (
            <div
              key={m.id}
              className={`model-row ${voteClass}`}
              role="group"
              aria-label={ariaText}
            >
              <div className="model-label-col">
                <span className="model-badge-letter" title={m.label}>
                  {m.short || m.label[0]}
                </span>
                <span className="model-name">{m.label}</span>
              </div>

              <div className="model-track-wrapper">
                <div className="model-track">
                  <span
                    className={`model-position-dot ${m.votesRain == null ? "dot-unknown" : m.votesRain ? "dot-rain" : "dot-dry"}`}
                    style={{ left: `${percentWidth}%` }}
                  />
                </div>
              </div>

              <div className="model-metrics-col">
                <span className="model-mm">{m.rainMm == null ? "--" : `${m.rainMm} mm`}</span>
                {m.rainProbability != null && (
                  <span className="model-prob">{m.rainProbability}%</span>
                )}
                <span
                  className={`model-vote-tag ${m.votesRain == null ? "tag-unknown" : m.votesRain ? "tag-rain" : "tag-dry"}`}
                  title={voteLabel}
                >
                  {m.votesRain == null ? "—" : m.votesRain ? "🌧️" : "☀️"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="model-votes-legend">
        <span>
          <strong>E:</strong> ECMWF IFS
        </span>
        <span>
          <strong>G:</strong> GFS Seamless
        </span>
        <span>
          <strong>I:</strong> ICON Seamless
        </span>
        <span className="scale-legend">
          {allHaveProb
            ? t("modelScaleProbability")
            : t("modelScaleRainfall").replace("{max}", maxMm)}
        </span>
      </div>
    </div>
  );
}
