// feedback/groundTruth.js — Ground Truth classification (Spec §29)

const OBSERVATION_SOURCES = {
  OFFICIAL: "official_station", // IMD / automated weather station (AWS)
  USER_CROWDSOURCED: "user_feedback", // Farmer / citizen report
};

/**
 * Normalizes feedback into a structured weather observation record.
 * Explicitly marks crowdsourced observations so they are never conflated with official station data.
 */
function createObservationRecord({
  userId,
  forecastId,
  cluster,
  location,
  forecastDate,
  predictedRain,
  actualRain,
  isOfficial = false,
}) {
  return {
    forecastId,
    userId,
    cluster,
    location,
    forecastDate,
    predictedRain: Boolean(predictedRain),
    actualRain: Boolean(actualRain),
    sourceType: isOfficial ? OBSERVATION_SOURCES.OFFICIAL : OBSERVATION_SOURCES.USER_CROWDSOURCED,
    weight: isOfficial ? 1.0 : 0.75, // Weight citizen reports appropriately
    recordedAt: new Date(),
  };
}

module.exports = {
  OBSERVATION_SOURCES,
  createObservationRecord,
};
