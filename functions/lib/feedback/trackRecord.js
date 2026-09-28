// feedback/trackRecord.js — Self-Grading Forecasts and Track Record Engine (Spec Section 2)
const { db } = require("../../admin");
const { RAIN_DAY_MM, TRACK_WINDOW_DAYS, PREDICT_RAIN_PROB } = require("../config");
const { info, warn, error } = require("../utils/logger");

/**
 * Pure helper to compute verification results for a single forecast_track doc.
 * Returns { final, verification } or null if invalid.
 */
function verifyForecastDoc(trackData, observedRainMm) {
  if (!trackData) return null;

  const targetDate = trackData.targetDate;
  if (!targetDate) return null;

  // Deadline: targetDate 00:00:00 IST
  const deadlineMs = new Date(`${targetDate}T00:00:00+05:30`).getTime();

  // Find latest history entry issued before deadline
  const history = Array.isArray(trackData.history) ? trackData.history : [];
  const eligible = history.filter((entry) => {
    if (!entry || !entry.issuedAt) return false;
    return new Date(entry.issuedAt).getTime() < deadlineMs;
  });

  if (eligible.length === 0) {
    return {
      final: null,
      verification: {
        status: "no_forecast",
        observedRainMm: observedRainMm != null ? observedRainMm : null,
        rained: null,
        hit: null,
        source: "model-analysis",
        verifiedAt: new Date().toISOString(),
      },
    };
  }

  // Sort eligible ascending by issuedAt to pick latest
  eligible.sort((a, b) => new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime());
  const latest = eligible[eligible.length - 1];

  const final = {
    issuedAt: latest.issuedAt,
    rainProbability: latest.rainProbability ?? 0,
    predictedRain: latest.predictedRain != null
      ? latest.predictedRain
      : (latest.rainProbability ?? 0) >= PREDICT_RAIN_PROB,
  };

  const modelRained = (observedRainMm ?? 0) >= RAIN_DAY_MM;
  let rained = modelRained;
  let source = "model-analysis";

  const farmer = trackData.farmer || { yes: 0, no: 0 };
  const totalFarmer = (farmer.yes || 0) + (farmer.no || 0);

  if (totalFarmer > 0) {
    if (farmer.yes > farmer.no) {
      rained = true;
      source = "farmer";
    } else if (farmer.no > farmer.yes) {
      rained = false;
      source = "farmer";
    } else {
      // Tie falls back to model-analysis
      rained = modelRained;
      source = "model-analysis";
    }
  }

  const hit = final.predictedRain === rained;

  return {
    final,
    verification: {
      status: "verified",
      observedRainMm: Math.round((observedRainMm ?? 0) * 10) / 10,
      rained,
      hit,
      source,
      verifiedAt: new Date().toISOString(),
    },
  };
}

function derivePredictedRain(trackData, targetDate) {
  if (!trackData) return null;
  if (trackData.final?.predictedRain != null) {
    return Boolean(trackData.final.predictedRain);
  }

  const deadlineMs = new Date(`${targetDate}T00:00:00+05:30`).getTime();
  const eligible = (Array.isArray(trackData.history) ? trackData.history : [])
    .filter((entry) => entry?.issuedAt && new Date(entry.issuedAt).getTime() < deadlineMs)
    .sort((a, b) => new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime());
  if (!eligible.length) return null;

  const latest = eligible[eligible.length - 1];
  return latest.predictedRain != null
    ? Boolean(latest.predictedRain)
    : Number(latest.rainProbability ?? 0) >= PREDICT_RAIN_PROB;
}

/**
 * Pure helper to aggregate verified days into the 30-day track record.
 * Filters to verified days only, sorts ascending by date, truncates to TRACK_WINDOW_DAYS.
 */
function computeTrackRecord(rawDays = [], isDemo = false) {
  const windowDays = TRACK_WINDOW_DAYS || 30;

  const verified = rawDays
    .filter((d) => {
      if (!d) return false;
      if (d.verification) {
        return d.verification.status === "verified";
      }
      return d.hit !== undefined && d.rained !== undefined;
    })
    .map((d) => {
      if (d.verification) {
        return {
          date: d.targetDate || d.date,
          predictedRain: Boolean(d.final?.predictedRain),
          rained: Boolean(d.verification.rained),
          hit: Boolean(d.verification.hit),
          source: d.verification.source || "model-analysis",
        };
      }
      return {
        date: d.date || d.targetDate,
        predictedRain: Boolean(d.predictedRain),
        rained: Boolean(d.rained),
        hit: Boolean(d.hit),
        source: d.source || "model-analysis",
      };
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  // Truncate to the most recent windowDays
  const windowSlice = verified.slice(-windowDays);

  let autoHits = 0;
  let autoTotal = 0;
  let farmerHits = 0;
  let farmerTotal = 0;

  for (const day of windowSlice) {
    if (day.source === "farmer") {
      farmerTotal++;
      if (day.hit) farmerHits++;
    } else {
      autoTotal++;
      if (day.hit) autoHits++;
    }
  }

  const totalHits = autoHits + farmerHits;
  const totalDays = autoTotal + farmerTotal;
  const hitRate = totalDays > 0 ? Math.round((totalHits / totalDays) * 100) : 0;

  return {
    windowDays,
    days: windowSlice,
    autoHits,
    autoTotal,
    farmerHits,
    farmerTotal,
    hits: totalHits,
    total: totalDays,
    hitRate,
    isDemo: Boolean(isDemo),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Rebuilds trust_scores/{clusterId}.trackRecord from the last 30 verified forecast_tracks docs.
 * Written with { merge: true } so existing nightly calibration is not clobbered.
 */
async function rebuildTrackRecord(clusterId, dbInstance = db) {
  try {
    const dates = [];
    const now = new Date();
    // Generate dates for the past 30 days in Asia/Kolkata
    for (let i = 1; i <= (TRACK_WINDOW_DAYS || 30); i++) {
      const dt = new Date(now.getTime() - i * 86400000);
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      dates.push(formatter.format(dt));
    }

    const docRefs = dates.map((d) => dbInstance.collection("forecast_tracks").doc(`${clusterId}_${d}`));
    const snapshots = await Promise.all(docRefs.map((ref) => ref.get()));

    const verifiedDocs = [];
    for (const snap of snapshots) {
      if (snap.exists) {
        const data = snap.data();
        if (data?.verification?.status === "verified") {
          verifiedDocs.push(data);
        }
      }
    }

    const isDemo = verifiedDocs.some((day) => day.isDemo === true);
    const trackRecord = computeTrackRecord(verifiedDocs, isDemo);

    await dbInstance.collection("trust_scores").doc(clusterId).set(
      { trackRecord },
      { merge: true }
    );

    info("Rebuilt track record for cluster", { clusterId, verifiedCount: trackRecord.days.length });
    return trackRecord;
  } catch (err) {
    error("Failed to rebuild track record", err, { clusterId });
    throw err;
  }
}

/**
 * Updates farmer votes in forecast_tracks on feedback submission.
 * Re-runs source precedence and rebuilds trackRecord if that day is already verified.
 */
async function updateFarmerVoteOnTrack({
  clusterId,
  targetDate,
  answer,
  isRepeatVote = false,
  previousAnswer = null,
}, dbInstance = db) {
  const docRef = dbInstance.collection("forecast_tracks").doc(`${clusterId}_${targetDate}`);
  const ansKey = answer.toLowerCase() === "yes" ? "yes" : "no";
  let wasVerified = false;

  await dbInstance.runTransaction(async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists) return;

    const data = snap.data() || {};
    const farmer = { yes: 0, no: 0, ...(data.farmer || {}) };
    if (!isRepeatVote) {
      farmer[ansKey] = (farmer[ansKey] || 0) + 1;
    } else if (previousAnswer && previousAnswer.toLowerCase() !== ansKey) {
      const prevKey = previousAnswer.toLowerCase() === "yes" ? "yes" : "no";
      farmer[prevKey] = Math.max(0, (farmer[prevKey] || 0) - 1);
      farmer[ansKey] = (farmer[ansKey] || 0) + 1;
    }

    const updatePayload = { farmer };
    wasVerified = data.verification?.status === "verified";

    if (wasVerified) {
      const observedRainMm = data.verification.observedRainMm ?? 0;
      const modelRained = observedRainMm >= RAIN_DAY_MM;
      let rained = modelRained;
      let source = "model-analysis";
      const totalFarmer = farmer.yes + farmer.no;

      if (totalFarmer > 0 && farmer.yes !== farmer.no) {
        rained = farmer.yes > farmer.no;
        source = "farmer";
      }

      updatePayload.verification = {
        ...data.verification,
        rained,
        hit: data.final?.predictedRain === rained,
        source,
        verifiedAt: new Date().toISOString(),
      };
    }

    transaction.set(docRef, updatePayload, { merge: true });
  });

  if (wasVerified) {
    await rebuildTrackRecord(clusterId, dbInstance);
  }
}

module.exports = {
  derivePredictedRain,
  verifyForecastDoc,
  computeTrackRecord,
  rebuildTrackRecord,
  updateFarmerVoteOnTrack,
};
