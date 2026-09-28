// weather/evidenceBuilder.js — Deterministic Evidence Builder (Spec Section 5)

/**
 * Builds the deterministic evidence payload explaining the metrics,
 * rules, model consensus, and track record behind an advisory.
 * NEVER built by LLM; strictly deterministic.
 *
 * @param {Object} params
 * @param {Object} params.weather - Normalized weather object
 * @param {string} params.role - User role
 * @param {Object} [params.detailedRule] - { text, ruleId, condition }
 * @param {Object} [params.trackRecord] - Trust track record { hits, total, windowDays }
 * @param {Array} [params.actionWindows] - Computed action windows
 * @returns {Object} Structured evidence payload
 */
function buildEvidence({
  weather = {},
  role = "farmer",
  detailedRule = null,
  trackRecord = null,
  actionWindows = [],
}) {
  const targetForecast = weather.tomorrow || weather.today || {};
  const current = weather;

  const rainProbability = targetForecast.rainProbability ?? current.rainProbability ?? null;
  const rainfallMm = targetForecast.rainfallMm ?? current.rainfallMm ?? null;
  const tempC = current.temperatureC ?? targetForecast.tempMaxC ?? null;
  const apparentC = current.apparentTemperatureC ?? null;
  const windKmh = targetForecast.windSpeedKmh ?? current.windSpeedKmh ?? null;
  const humidityPercent = current.humidityPercent ?? null;

  const agreement = weather.modelAgreement;
  const modelAgreementData = agreement
    ? {
        rainVotes: agreement.rainVotes ?? 0,
        of: agreement.of ?? 3,
        level: agreement.level ?? "split",
        spreadMm: agreement.spreadMm ?? 0,
      }
    : null;

  const trackRecordData = trackRecord
    ? {
        hits: trackRecord.hits ?? trackRecord.autoHits ?? 0,
        total: trackRecord.total ?? trackRecord.autoTotal ?? 0,
        windowDays: trackRecord.windowDays ?? 30,
        hitRate: trackRecord.hitRate ?? null,
      }
    : null;

  const actionWindowBasis = (actionWindows || []).flatMap((w) =>
    (w.basis || []).map((b) => ({
      windowType: w.type,
      metric: b.metric,
      value: b.value,
      unit: b.unit,
    }))
  );

  return {
    dataAsOf: weather.timestamp || null,
    source: "Open-Meteo",
    modelNote: agreement ? "ECMWF IFS 0.25°, GFS Seamless, ICON Seamless" : null,
    inputs: {
      rainProbability,
      rainfallMm,
      tempC,
      apparentC,
      windKmh,
      humidityPercent,
    },
    ruleApplied: detailedRule
      ? {
          role,
          ruleId: detailedRule.ruleId || "default",
          condition: detailedRule.condition || "default",
        }
      : {
          role,
          ruleId: "default",
          condition: "default",
        },
    modelAgreement: modelAgreementData,
    trackRecord: trackRecordData,
    actionWindowBasis,
  };
}

module.exports = { buildEvidence };
