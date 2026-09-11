// feedback/calibration.js — Local Calibration & Trust Score Calculation (Spec §30, §31, §32)
const { db } = require("../../admin");
const { TRUST_THRESHOLDS } = require("../config");
const { info, error } = require("../utils/logger");

/**
 * Calculates calibration metrics from a set of feedback / observation records:
 * 1. forecast accuracy (0.00 to 1.00)
 * 2. regional bias (e.g. +1.2 means model tends to over-predict rain in this region)
 * 3. local trust score
 * 4. sample count
 */
function computeCalibration(observations) {
  const total = observations.length;
  if (total === 0) {
    return {
      accuracyScore: null,
      regionalBias: 0,
      trustScore: null,
      sampleCount: 0,
      confidenceLevel: "insufficient",
    };
  }

  let correctCount = 0;
  let predictedRainCount = 0;
  let actualRainCount = 0;

  for (const obs of observations) {
    const p = Boolean(obs.predictedRain);
    const a = Boolean(obs.actualRain);

    if (p === a) correctCount++;
    if (p) predictedRainCount++;
    if (a) actualRainCount++;
  }

  const rawAccuracy = correctCount / total;
  // Regional bias: positive means model over-predicts rain; negative means model under-predicts
  const bias = Number(((predictedRainCount - actualRainCount) / total).toFixed(2));

  // Determine confidence tier (Spec §31)
  let confidenceLevel = "insufficient";
  let trustScore = null;

  if (total <= TRUST_THRESHOLDS.INSUFFICIENT_MAX) {
    confidenceLevel = "insufficient";
    trustScore = null;
  } else if (total <= TRUST_THRESHOLDS.LOW_CONFIDENCE_MAX) {
    confidenceLevel = "low";
    trustScore = Number(rawAccuracy.toFixed(2));
  } else {
    confidenceLevel = "usable";
    trustScore = Number(rawAccuracy.toFixed(2));
  }

  return {
    accuracyScore: Number(rawAccuracy.toFixed(2)),
    regionalBias: bias,
    trustScore,
    sampleCount: total,
    confidenceLevel,
  };
}

/**
 * Immediate calibration: Recalculates trust score for a specific cluster right after user feedback (Spec §32).
 */
async function recalibrateClusterImmediately(clusterId) {
  try {
    const snap = await db
      .collection("feedback")
      .where("cluster.clusterId", "==", clusterId)
      .get();

    const observations = snap.docs.map((d) => d.data());
    const calibration = computeCalibration(observations);

    await db.collection("trust_scores").doc(clusterId).set(
      {
        ...calibration,
        clusterId,
        lastUpdated: new Date(),
      },
      { merge: true }
    );

    info("Immediate recalibration complete", { clusterId, sampleCount: calibration.sampleCount, trustScore: calibration.trustScore });
    return calibration;
  } catch (err) {
    error("Failed immediate recalibration", err, { clusterId });
    return null;
  }
}

/**
 * Nightly scheduled batch calibration across all feedback (Spec §32).
 */
async function recalibrateAllClustersNightly() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30-day window
  const snap = await db.collection("feedback").where("submittedAt", ">=", since).get();

  const clusterGroups = {};
  snap.forEach((doc) => {
    const data = doc.data();
    const cId = data.cluster?.clusterId || data.geohash?.slice(0, 4) || "coimbatore";
    if (!clusterGroups[cId]) clusterGroups[cId] = [];
    clusterGroups[cId].push(data);
  });

  const writePromises = Object.entries(clusterGroups).map(async ([clusterId, obs]) => {
    const metrics = computeCalibration(obs);
    return db.collection("trust_scores").doc(clusterId).set(
      {
        ...metrics,
        clusterId,
        lastUpdated: new Date(),
      },
      { merge: true }
    );
  });

  await Promise.all(writePromises);
  info(`Nightly calibration recomputed trust scores for ${Object.keys(clusterGroups).length} clusters.`);
}

module.exports = {
  computeCalibration,
  recalibrateClusterImmediately,
  recalibrateAllClustersNightly,
};
