// feedback/feedback.js — Feedback submission handler (Spec §28, §29, §32)
const { db } = require("../../admin");
const { resolveCluster, encode } = require("../utils/geo");
const { createObservationRecord } = require("./groundTruth");
const { recalibrateClusterImmediately } = require("./calibration");
const { info, error } = require("../utils/logger");

function actualRainFromAccuracy(predictedRain, forecastAccurate) {
  return Boolean(predictedRain) === forecastAccurate;
}

/**
 * Stores observed rain truth from forecast-accuracy feedback or a legacy rain answer.
 */
async function recordUserFeedback({
  userId,
  forecastId,
  lat,
  lng,
  forecastDate,
  predictedRain = true,
  answer,
  forecastAccurate,
  role = "general",
  clusterId: suppliedClusterId = null,
  districtName = null,
  dbInstance = db,
  recalibrate = recalibrateClusterImmediately,
}) {
  const now = new Date();
  const hasAccuracyAnswer = typeof forecastAccurate === "boolean";
  const actualRain = hasAccuracyAnswer
    ? actualRainFromAccuracy(predictedRain, forecastAccurate)
    : answer.toLowerCase() === "yes";
  const cluster = suppliedClusterId
    ? { clusterType: "district", clusterId: suppliedClusterId, displayName: districtName || suppliedClusterId }
    : resolveCluster(lat, lng, districtName);
  const hash = lat != null && lng != null ? encode(lat, lng, 6) : null;
  const targetDate = forecastDate || now.toISOString().split("T")[0];
  const docId = `${userId}_${cluster.clusterId}_${targetDate}`;

  const feedbackDoc = {
    forecastId: forecastId || `forecast_${cluster.clusterId}_${targetDate}`,
    userId,
    location: {
      ...(lat != null ? { latitude: lat } : {}),
      ...(lng != null ? { longitude: lng } : {}),
    },
    geohash: hash,
    cluster,
    forecastDate: targetDate,
    predictedRain: Boolean(predictedRain),
    actualRain: actualRain,
    forecastAccurate: actualRain === Boolean(predictedRain),
    answer: actualRain ? "YES" : "NO",
    role,
    submittedAt: now,
  };

  try {
    const docRef = dbInstance.collection("feedback").doc(docId);
    let previousVote = null;

    // Read and overwrite atomically so repeat votes replace the previous response.
    await dbInstance.runTransaction(async (transaction) => {
      const existingSnap = await transaction.get(docRef);
      previousVote = existingSnap.exists ? existingSnap.data() : null;
      transaction.set(docRef, feedbackDoc);
    });

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
    await dbInstance.collection("weather_observations").doc(docId).set(observation);

    // 3. Immediate local calibration (Spec §32)
    const updatedCalibration = await recalibrate(cluster.clusterId);

    info("Recorded user feedback and ran immediate calibration", {
      feedbackId: docId,
      clusterId: cluster.clusterId,
      actualRain,
      isRepeatVote: Boolean(previousVote),
    });

    return {
      success: true,
      feedbackId: docId,
      calibration: updatedCalibration,
      isRepeatVote: Boolean(previousVote),
      previousAnswer: previousVote ? previousVote.answer : null,
    };
  } catch (err) {
    error("Failed to record feedback", err, { userId, clusterId: cluster.clusterId });
    throw err;
  }
}

module.exports = { recordUserFeedback, actualRainFromAccuracy };
