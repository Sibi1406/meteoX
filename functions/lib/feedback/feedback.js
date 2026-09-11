// feedback/feedback.js — Feedback submission handler (Spec §28, §29, §32)
const { db } = require("../../admin");
const { resolveCluster, encode } = require("../utils/geo");
const { createObservationRecord } = require("./groundTruth");
const { recalibrateClusterImmediately } = require("./calibration");
const { info, error } = require("../utils/logger");

/**
 * Stores feedback when user answers "Did it rain as predicted? YES / NO" (Spec §28)
 */
async function recordUserFeedback({
  userId,
  forecastId,
  lat,
  lng,
  forecastDate,
  predictedRain = true,
  answer, // "yes" or "no"
  role = "general",
}) {
  const actualRain = answer.toLowerCase() === "yes";
  const cluster = resolveCluster(lat, lng);
  const hash = lat != null && lng != null ? encode(lat, lng, 6) : null;
  const now = new Date();

  const feedbackDoc = {
    forecastId: forecastId || `forecast_${cluster.clusterId}_${forecastDate || now.toISOString().split("T")[0]}`,
    userId,
    location: {
      latitude: lat,
      longitude: lng,
    },
    geohash: hash,
    cluster,
    forecastDate: forecastDate || now.toISOString().split("T")[0],
    predictedRain: Boolean(predictedRain),
    actualRain: actualRain,
    answer: answer.toUpperCase(), // "YES" or "NO"
    role,
    submittedAt: now,
  };

  try {
    // 1. Write feedback document
    const docRef = await db.collection("feedback").add(feedbackDoc);

    // 2. Also record in weather_observations with ground-truth distinction (Spec §29)
    const observation = createObservationRecord({
      userId,
      forecastId: feedbackDoc.forecastId,
      cluster,
      location: feedbackDoc.location,
      forecastDate: feedbackDoc.forecastDate,
      predictedRain,
      actualRain,
      isOfficial: false,
    });
    await db.collection("weather_observations").add(observation);

    // 3. Immediate local calibration (Spec §32)
    const updatedCalibration = await recalibrateClusterImmediately(cluster.clusterId);

    info("Recorded user feedback and ran immediate calibration", {
      feedbackId: docRef.id,
      clusterId: cluster.clusterId,
      actualRain,
    });

    return {
      success: true,
      feedbackId: docRef.id,
      calibration: updatedCalibration,
    };
  } catch (err) {
    error("Failed to record feedback", err, { userId, clusterId: cluster.clusterId });
    throw err;
  }
}

module.exports = { recordUserFeedback };
