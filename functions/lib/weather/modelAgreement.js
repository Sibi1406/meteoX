// weather/modelAgreement.js — Multi-Model Agreement Engine (Spec Section 1)
const { RAIN_DAY_MM, MODELS } = require("../config");

const MODEL_INFO = {
  ecmwf_ifs025: { id: "ecmwf_ifs025", label: "ECMWF", short: "E" },
  gfs_seamless: { id: "gfs_seamless", label: "GFS", short: "G" },
  icon_seamless: { id: "icon_seamless", label: "ICON", short: "I" },
};

/**
 * Computes model agreement for a single forecast day.
 * Votes are cast strictly on precipitation_sum >= RAIN_DAY_MM.
 *
 * Agreement is agreement, not accuracy. Agreeing models are not necessarily correct.
 */
function computeAgreementForDay(daily = {}, index = 0, date = null) {
  const models = [];
  const modelKeys = MODELS || ["ecmwf_ifs025", "gfs_seamless", "icon_seamless"];

  for (const modelId of modelKeys) {
    const meta = MODEL_INFO[modelId] || { id: modelId, label: modelId.toUpperCase(), short: modelId[0].toUpperCase() };
    const sumKey = `precipitation_sum_${modelId}`;
    const probKey = `precipitation_probability_max_${modelId}`;

    const rawMm = daily[sumKey]?.[index];
    const parsedMm = rawMm != null && rawMm !== "" ? Number(rawMm) : null;
    const rainMm = parsedMm != null && Number.isFinite(parsedMm)
      ? Math.round(parsedMm * 10) / 10
      : null;

    const rawProb = daily[probKey]?.[index];
    const parsedProbability = rawProb != null && rawProb !== "" ? Number(rawProb) : null;
    const rainProbability = parsedProbability != null && Number.isFinite(parsedProbability)
      ? parsedProbability
      : null;

    const votesRain = rainMm == null ? null : rainMm >= RAIN_DAY_MM;

    models.push({
      id: modelId,
      label: meta.label,
      short: meta.short,
      rainMm,
      rainProbability,
      votesRain,
    });
  }

  const availableModels = models.filter((model) => model.votesRain != null);
  if (availableModels.length === 0) return null;
  const rainVotes = availableModels.filter((model) => model.votesRain).length;
  const total = availableModels.length;

  let level = "split";
  if (rainVotes === total) {
    level = "agree_rain";
  } else if (rainVotes === 0) {
    level = "agree_dry";
  } else {
    level = "split";
  }

  const mmValues = availableModels.map((model) => model.rainMm);
  const spreadMm = mmValues.length > 0
    ? Math.round((Math.max(...mmValues) - Math.min(...mmValues)) * 10) / 10
    : null;

  const targetDate = date || daily.time?.[index] || null;

  return {
    date: targetDate,
    models,
    rainVotes,
    of: total,
    level,
    spreadMm,
  };
}

/**
 * Computes model agreement for today and tomorrow.
 * Returns agreement for today and tomorrow, with tomorrow's values also spread at root
 * for convenient single-day access.
 */
function computeModelAgreement(raw) {
  if (!raw || !raw.daily) {
    return null;
  }

  const daily = raw.daily;
  const times = daily.time || [];

  const todayIndex = 0;
  const tomorrowIndex = times.length > 1 ? 1 : 0;

  const todayAgreement = computeAgreementForDay(daily, todayIndex, times[todayIndex]);
  const tomorrowAgreement = computeAgreementForDay(daily, tomorrowIndex, times[tomorrowIndex]);
  if (!todayAgreement && !tomorrowAgreement) return null;

  return {
    ...(tomorrowAgreement || todayAgreement),
    today: todayAgreement,
    tomorrow: tomorrowAgreement,
  };
}

module.exports = {
  computeModelAgreement,
  computeAgreementForDay,
  MODEL_INFO,
};
