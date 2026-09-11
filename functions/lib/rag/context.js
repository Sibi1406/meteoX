// rag/context.js — Local Trust Retrieval from Firestore (Spec §17, §30, §31)
const { db } = require("../../admin");
const { districtPrefix } = require("../utils/geo");
const { TRUST_THRESHOLDS } = require("../config");
const { info, error } = require("../utils/logger");

/**
 * Retrieves the local trust score for a location cluster (Spec §17).
 * If sample count is <= 5, treats as insufficient data and returns null or marked insufficient.
 */
async function getLocalTrustScore(cluster, geohash = null) {
  const clusterId = cluster?.clusterId || (geohash ? districtPrefix(geohash) : "coimbatore");

  try {
    // Check cluster document in trust_scores
    const snap = await db.collection("trust_scores").doc(clusterId).get();

    if (!snap.exists) {
      info("No trust score doc found for cluster", { clusterId });
      return null;
    }

    const data = snap.data();
    const sampleCount = data.sampleCount != null ? data.sampleCount : (data.totalFeedback || 0);
    const accuracyScore = data.accuracyScore != null ? Number(data.accuracyScore) : null;
    const regionalBias = data.regionalBias != null ? Number(data.regionalBias) : 0;
    const trustScore = data.trustScore != null ? Number(data.trustScore) : accuracyScore;

    // Spec §31: 0-5 observations -> Insufficient data (return null for Gemini context so it does not invent confidence)
    if (sampleCount <= TRUST_THRESHOLDS.INSUFFICIENT_MAX) {
      return {
        clusterType: cluster?.clusterType || "district",
        clusterId,
        accuracyScore: null,
        regionalBias: null,
        trustScore: null,
        sampleCount,
        confidenceLevel: "insufficient",
        isUsable: false,
        note: "Not enough local observations yet (minimum 6 required).",
      };
    }

    const confidenceLevel = sampleCount <= TRUST_THRESHOLDS.LOW_CONFIDENCE_MAX ? "low" : "usable";

    return {
      clusterType: cluster?.clusterType || "district",
      clusterId,
      accuracyScore,
      regionalBias,
      trustScore,
      sampleCount,
      confidenceLevel,
      isUsable: true,
      lastUpdated: data.lastUpdated ? data.lastUpdated.toDate().toISOString() : null,
      isDemo: Boolean(data.isDemo),
    };
  } catch (err) {
    error("Error loading trust score", err, { clusterId });
    return null;
  }
}

module.exports = { getLocalTrustScore };
