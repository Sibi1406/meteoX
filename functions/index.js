// index.js — Cloud Functions entry point for WeatherGPT (Node.js 22)
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");

const { db, messaging } = require("./admin");
const { getWeather } = require("./lib/weather/weather");
const { processQuery } = require("./lib/query/queryProcessor");
const { retrieveStructuredData } = require("./lib/rag/retrieval");
const { buildRagContext } = require("./lib/rag/contextBuilder");
const { generateAdvisoryWithGrounding } = require("./lib/ai/advisory");
const { evaluateRoleAdvisory, evaluateRoleAdvisoryDetailed } = require("./lib/advisory/roleRules");
const { computeActionWindows } = require("./lib/advisory/actionWindows");
const { computeDrift } = require("./lib/weather/drift");
const { buildEvidence } = require("./lib/weather/evidenceBuilder");
const { recordUserFeedback, actualRainFromAccuracy } = require("./lib/feedback/feedback");
const { recalibrateAllClustersNightly } = require("./lib/feedback/calibration");
const { derivePredictedRain, updateFarmerVoteOnTrack } = require("./lib/feedback/trackRecord");
const { runSnapshotForecasts, runVerifyForecasts, getISTDateString, recordDashboardForecastSnapshots } = require("./lib/feedback/schedulerJobs");
const { detectSevereWeather, calculateSeverity } = require("./lib/alerts/detection");
const { filterAlertsForUser } = require("./lib/alerts/vulnerability");
const { buildPersonalizedAlert, sendFcmAlert, SmsAdapter } = require("./lib/alerts/personalization");
const { resolveCluster, encode, districtPrefix, listDistricts } = require("./lib/utils/geo");
const { info, warn, error } = require("./lib/utils/logger");
const { RAIN_DAY_MM, PREDICT_RAIN_PROB } = require("./lib/config");

setGlobalOptions({ region: "asia-south1", maxInstances: 10 });

const geminiKey = defineSecret("GEMINI_API_KEY");
const bhashiniKey = defineSecret("BHASHINI_API_KEY");
const twilioAccountSid = defineSecret("TWILIO_ACCOUNT_SID");
const twilioAuthToken = defineSecret("TWILIO_AUTH_TOKEN");
const DEMO_SMS_FALLBACK_NUMBER = "+918220933143";

function buildWeatherFacts(weather, forecast, isTamil) {
  const minimumTemperature = forecast?.tempMinC;
  const maximumTemperature = forecast?.tempMaxC ?? weather?.temperatureC ?? 30;
  const temperatureValue = minimumTemperature != null
    ? `${Math.round(minimumTemperature)}–${Math.round(maximumTemperature)}°C`
    : `${Math.round(maximumTemperature)}°C`;
  const facts = [
    {
      icon: "🌧",
      label: isTamil ? "மழை வாய்ப்பு" : "Rain chance",
      value: `${forecast?.rainProbability ?? weather?.rainProbability ?? 0}%`,
    },
    {
      icon: "🌡",
      label: isTamil ? "வெப்பநிலை" : "Temperature",
      value: temperatureValue,
    },
    {
      icon: "💨",
      label: isTamil ? "காற்று" : "Wind",
      value: `${Math.round(forecast?.windSpeedKmh ?? weather?.windSpeedKmh ?? 12)} km/h`,
    },
  ];

  const rainfallMm = forecast?.rainfallMm ?? weather?.rainfallMm;
  if (rainfallMm != null) {
    facts.push({
      icon: "💧",
      label: isTamil ? "மழையளவு" : "Rainfall",
      value: `${Math.round(rainfallMm * 2) / 2} mm`,
    });
  }
  return facts;
}

function buildFactualAction(intent, role, isTamil) {
  const actions = {
    temperature: {
      farmer: ["Plan fieldwork for cooler hours if it feels hot.", "வெயிலாக இருந்தால் வயல் பணிகளை குளிர்ச்சியான நேரத்தில் செய்யுங்கள்."],
      fisherman: ["Take water and shade breaks during shore work.", "கரையோரப் பணிகளில் தண்ணீர் குடித்து நிழலில் ஓய்வெடுங்கள்."],
      city_admin: ["Keep water available for people working outdoors.", "வெளியில் பணிபுரிபவர்களுக்கு தண்ணீர் கிடைப்பதை உறுதிசெய்யுங்கள்."],
      general: ["Take shade and water breaks if you are outdoors.", "வெளியில் இருந்தால் நிழலில் ஓய்வெடுத்து தண்ணீர் குடியுங்கள்."],
    },
    rainfall: {
      farmer: ["Check field conditions before deciding when to spray.", "மருந்து தெளிக்கும் நேரத்தை முடிவு செய்வதற்கு முன் வயல் நிலையைப் பாருங்கள்."],
      fisherman: ["Check official marine notices before heading out.", "கடலுக்குச் செல்வதற்கு முன் அதிகாரப்பூர்வ கடல் எச்சரிக்கைகளைப் பாருங்கள்."],
      city_admin: ["Watch drainage points if rain develops.", "மழை பெய்தால் வடிகால் பகுதிகளைக் கண்காணியுங்கள்."],
      general: ["Keep rain protection handy if you will be outdoors.", "வெளியில் செல்லும்போது மழைப் பாதுகாப்பை எடுத்துச் செல்லுங்கள்."],
    },
    wind: {
      farmer: ["Wait for calmer conditions before spraying.", "காற்று தணிந்த பிறகு மருந்து தெளியுங்கள்."],
      fisherman: ["Check official marine notices before heading out.", "கடலுக்குச் செல்வதற்கு முன் அதிகாரப்பூர்வ கடல் எச்சரிக்கைகளைப் பாருங்கள்."],
      city_admin: ["Check loose outdoor signs if winds pick up.", "காற்று அதிகரித்தால் தளர்வான வெளிப்புறப் பலகைகளைச் சரிபாருங்கள்."],
      general: ["Take care around trees and loose items outdoors.", "வெளியில் மரங்கள் மற்றும் தளர்வான பொருட்கள் அருகே கவனமாக இருங்கள்."],
    },
  };
  const roleActions = actions[intent] || actions.rainfall;
  return (roleActions[role] || roleActions.general)[isTamil ? 1 : 0];
}

// ---------------------------------------------------------------------------
// 1. handleQuery — End-to-End Query Understanding -> RAG -> Gemini -> Grounding
// ---------------------------------------------------------------------------
exports.handleQuery = onCall(
  { secrets: [geminiKey, bhashiniKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Please sign in to access WeatherGPT.");
    }

    const { query, lat, lng, role, languageCode } = request.data;
    if (!query || lat == null || lng == null) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required query parameters: query, lat, lng."
      );
    }

    const effectiveRole = role || "general";
    const requestedLang = languageCode || "en";

    try {
      // Step 1: Query Understanding (Spec §8)
      const queryAnalysis = processQuery(
        query,
        { role: effectiveRole, preferredLanguage: requestedLang },
        { lat, lng }
      );

      const targetLat = queryAnalysis.targetCoords.lat || lat;
      const targetLng = queryAnalysis.targetCoords.lng || lng;
      const language = queryAnalysis.language || requestedLang;

      // Step 2 & 3: Structured RAG Retrieval (Weather + Trust + Role Rules) (Spec §16)
      const { weather, localTrust, rawTrust, roleRules } = await retrieveStructuredData({
        lat: targetLat,
        lng: targetLng,
        role: effectiveRole,
        language,
      });

      const cluster = weather.location?.cluster || resolveCluster(targetLat, targetLng);

      // Step 3b: Compute role action windows (Spec §Section 4)
      const actionWindows = computeActionWindows({
        hourly: weather.hourly,
        role: effectiveRole,
        now: new Date(),
      });
      weather.actionWindows = actionWindows;

      const detailedRule = evaluateRoleAdvisoryDetailed(effectiveRole, weather, language);
      const evidence = buildEvidence({
        weather,
        role: effectiveRole,
        detailedRule,
        trackRecord: rawTrust?.trackRecord || null,
        actionWindows,
      });

      // Step 4: Direct factual response optimization (Spec §41)
      // If query is a simple factual check (e.g. "What is the temperature tomorrow?"),
      // answer directly without invoking Gemini LLM.
      let responsePayload;

      if (queryAnalysis.isFactualOnly) {
        const isTamil = language === "ta";
        const targetForecast = queryAnalysis.dateTime === "today" ? weather.today : weather.tomorrow;
        const directHeadlines = {
          temperature: isTamil ? "இதோ நீங்கள் கேட்ட வெப்பநிலை முன்னறிவிப்பு." : "Here is the temperature outlook you asked for.",
          rainfall: isTamil ? "இதோ நீங்கள் கேட்ட மழை முன்னறிவிப்பு." : "Here is the rain outlook you asked for.",
          wind: isTamil ? "இதோ நீங்கள் கேட்ட காற்று முன்னறிவிப்பு." : "Here is the wind outlook you asked for.",
        };
        responsePayload = {
          headline: directHeadlines[queryAnalysis.intent],
          facts: buildWeatherFacts(weather, targetForecast, isTamil),
          action: buildFactualAction(queryAnalysis.intent, effectiveRole, isTamil),
          localTrust: localTrust
            ? {
                trustScore: `${Math.round((localTrust.trustScore || 0.8) * 100)}%`,
                sampleCount: localTrust.sampleCount,
                confidenceLevel: localTrust.confidenceLevel,
              }
            : null,
          isDirectFactual: true,
        };
      } else {
        // Step 5: Full RAG Context Builder -> Grounded Gemini Advisory (Spec §19, §20, §21, §22)
        const ragContext = buildRagContext({
          userQuery: query,
          role: effectiveRole,
          language,
          location: { latitude: targetLat, longitude: targetLng, cluster },
          weather,
          localTrust,
          roleRules,
          dateTime: queryAnalysis.dateTime,
        });

        responsePayload = await generateAdvisoryWithGrounding({
          query,
          context: ragContext,
        });
      }

      responsePayload = { ...responsePayload, severity: calculateSeverity(weather) };

      // Step 6: Log query audit record to Firestore (Spec §14)
      const now = new Date();
      const forecastId = `${encode(targetLat, targetLng, 6)}_${weather.tomorrow?.date || now.toISOString().split("T")[0]}`;
      const forecastRef = db.collection("forecast_records").doc(forecastId);
      const forecastSnap = await forecastRef.get();
      const forecastData = forecastSnap.exists ? forecastSnap.data() || {} : {};
      await forecastRef.set({
        forecastId,
        location: { latitude: targetLat, longitude: targetLng },
        cluster,
        forecastDate: weather.tomorrow?.date || now.toISOString().split("T")[0],
        predictedRain: (weather.tomorrow?.rainProbability || 0) >= PREDICT_RAIN_PROB,
        predictedRainfallMm: weather.tomorrow?.rainfallMm || 0,
        rainProbability: weather.tomorrow?.rainProbability || 0,
        weatherCondition: weather.tomorrow?.weatherCondition || weather.weatherCondition,
        generatedAt: forecastData.generatedAt || now,
        sources: weather.sources || forecastData.sources || ["open-meteo"],
        feedbackGiven: forecastData.feedbackGiven ?? false,
      }, { merge: true });

      const logDoc = {
        uid: request.auth.uid,
        role: effectiveRole,
        query,
        queryIntent: queryAnalysis.intent,
        language,
        location: { latitude: targetLat, longitude: targetLng, cluster },
        weatherCondition: weather.weatherCondition,
        advisory: responsePayload,
        evidence,
        fromCache: weather.fromCache || false,
        createdAt: now,
      };

      const logRef = await db.collection("queries").add(logDoc);

      return {
        queryId: logRef.id,
        forecastId,
        advisory: responsePayload,
        evidence,
        rainDayMm: RAIN_DAY_MM,
        weather: {
          current: {
            temperatureC: weather.temperatureC,
            rainfallMm: weather.rainfallMm,
            rainProbability: weather.rainProbability,
            humidityPercent: weather.humidityPercent,
            windSpeedKmh: weather.windSpeedKmh,
            weatherCondition: weather.weatherCondition,
          },
          tomorrow: weather.tomorrow,
          cluster,
          sources: weather.sources,
          modelAgreement: weather.modelAgreement || null,
          actionWindows,
          fromCache: weather.fromCache,
          cacheFreshness: weather.cacheFreshness,
        },
        localTrust: rawTrust,
      };
    } catch (err) {
      error("Error processing handleQuery", err, { uid: request.auth.uid });
      throw new HttpsError("internal", err.message || "Weather processing error");
    }
  }
);

// ---------------------------------------------------------------------------
// 2. getWeatherDashboard — Pre-fetches comprehensive dashboard state
// ---------------------------------------------------------------------------
exports.getWeatherDashboard = onCall({ invoker: ["public"] }, async (request) => {
  const { lat, lng, role, languageCode, district, cluster: requestedCluster } = request.data || {};
  if (lat == null || lng == null) {
    throw new HttpsError("invalid-argument", "Latitude and Longitude required");
  }

  const effectiveRole = role || "farmer";
  const lang = languageCode || "en";

  try {
    const weather = await getWeather(lat, lng, lang);
    const cluster = requestedCluster?.clusterId && requestedCluster?.displayName
      ? requestedCluster
      : resolveCluster(lat, lng, district);
    weather.location = { ...weather.location, cluster };

    try {
      await recordDashboardForecastSnapshots({ cluster, dailyForecasts: weather.daily });
    } catch (snapshotErr) {
      warn("Failed to snapshot dashboard forecasts", { error: snapshotErr.message, clusterId: cluster.clusterId });
    }

    // Retrieve trust score for this cluster
    const trustDoc = await db.collection("trust_scores").doc(cluster.clusterId).get();
    const trustData = trustDoc.exists ? trustDoc.data() : null;

    // Detect any severe threshold alerts
    const severeAlerts = detectSevereWeather(weather);
    const relevantAlerts = filterAlertsForUser(severeAlerts, effectiveRole);

    // Compute role action windows (Spec Section 4)
    const actionWindows = computeActionWindows({
      hourly: weather.hourly,
      role: effectiveRole,
      now: new Date(),
    });
    weather.actionWindows = actionWindows;

    // Read tomorrow's forecast track doc to compute drift (Spec Section 3)
    const tomorrowStr = getISTDateString(1);
    let drift = null;
    try {
      const tomorrowTrackDoc = await db.collection("forecast_tracks").doc(`${cluster.clusterId}_${tomorrowStr}`).get();
      if (tomorrowTrackDoc.exists) {
        drift = computeDrift(tomorrowTrackDoc.data()?.history, new Date());
      }
    } catch (driftErr) {
      warn("Failed to compute forecast drift", { error: driftErr.message });
    }

    const trackRecord = trustData?.trackRecord || null;

    // Get deterministic agricultural / role advisory with rule tracking
    const detailedRule = evaluateRoleAdvisoryDetailed(effectiveRole, weather, lang);
    const roleAdvisory = detailedRule.text;
    const severity = calculateSeverity(weather);
    const isTamil = lang === "ta";
    const severityHeadlines = {
      urgent: isTamil ? "கடுமையான வானிலை குறித்து கூடுதல் கவனம் தேவை." : "Take extra care with the severe weather ahead.",
      caution: isTamil ? "மாறும் வானிலையை கவனித்துத் திட்டமிடுங்கள்." : "Keep an eye on changing conditions as you plan.",
      normal: isTamil ? "வழக்கமான திட்டங்களைத் தொடர வானிலை சாதகமாக உள்ளது." : "Conditions look manageable for your usual plans.",
    };
    const dashboardAdvisory = {
      headline: severityHeadlines[severity],
      facts: buildWeatherFacts(weather, weather.tomorrow || weather.today, isTamil),
      action: roleAdvisory,
      severity,
    };

    // Deterministic evidence payload (Spec Section 5)
    const evidence = buildEvidence({
      weather,
      role: effectiveRole,
      detailedRule,
      trackRecord,
      actionWindows,
    });

    return {
      weather,
      cluster,
      severity,
      advisory: dashboardAdvisory,
      trustScore: trustData
        ? {
            accuracyScore: trustData.accuracyScore,
            trustScore: trustData.trustScore,
            sampleCount: trustData.sampleCount || trustData.totalFeedback || 0,
            confidenceLevel: trustData.confidenceLevel || "low",
            regionalBias: trustData.regionalBias || 0,
            isDemo: Boolean(trustData.isDemo || trustData.trackRecord?.isDemo),
          }
        : null,
      trackRecord,
      drift,
      actionWindows,
      evidence,
      rainDayMm: RAIN_DAY_MM,
      alerts: relevantAlerts,
    };
  } catch (err) {
    error("Dashboard fetch error", err, { lat, lng });
    throw new HttpsError("internal", "Could not load dashboard weather");
  }
});

// ---------------------------------------------------------------------------
// 3. submitFeedback — User feedback with immediate calibration (Spec §28, §32)
// ---------------------------------------------------------------------------
exports.submitFeedback = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Please sign in to submit feedback.");
  }

  const { clusterId: clientClusterId, forecastDate, answer, forecastAccurate, lat, lng, role, district } = request.data || {};
  const hasAccuracyAnswer = typeof forecastAccurate === "boolean";
  const legacyAnswer = String(answer || "").toLowerCase();
  if ((!hasAccuracyAnswer && !["yes", "no"].includes(legacyAnswer)) || (lat == null && !clientClusterId)) {
    throw new HttpsError("invalid-argument", "Missing forecast accuracy answer or location coordinates.");
  }

  try {
    const cluster = clientClusterId
      ? { clusterId: clientClusterId, displayName: district || clientClusterId }
      : resolveCluster(lat, lng, district);
    const targetClusterId = cluster.clusterId;
    const targetDate = forecastDate || getISTDateString(-1);

    // Derive predictedRain server-side from stored forecast (Section 0a, Section 2)
    const trackRef = db.collection("forecast_tracks").doc(`${targetClusterId}_${targetDate}`);
    const trackSnap = await trackRef.get();
    const derivedPredictedRain = derivePredictedRain(
      trackSnap.exists ? trackSnap.data() : null,
      targetDate
    );
    if (derivedPredictedRain == null) {
      throw new HttpsError("failed-precondition", "No stored forecast is available for this district and date.");
    }

    const actualRain = hasAccuracyAnswer
      ? actualRainFromAccuracy(derivedPredictedRain, forecastAccurate)
      : legacyAnswer === "yes";
    const actualRainAnswer = actualRain ? "yes" : "no";

    const result = await recordUserFeedback({
      userId: request.auth.uid,
      forecastId: `${targetClusterId}_${targetDate}`,
      lat,
      lng,
      forecastDate: targetDate,
      predictedRain: derivedPredictedRain,
      answer: actualRainAnswer,
      ...(hasAccuracyAnswer ? { forecastAccurate } : {}),
      role: role || "general",
      clusterId: targetClusterId,
      districtName: cluster.displayName,
    });

    // Transactionally update farmer counts in forecast_tracks and recalculate trackRecord if verified
    await updateFarmerVoteOnTrack({
      clusterId: targetClusterId,
      targetDate,
      answer: actualRainAnswer,
      isRepeatVote: result.isRepeatVote,
      previousAnswer: result.previousAnswer,
    });

    return {
      success: true,
      feedbackGiven: true,
      message: "Feedback recorded and local calibration updated.",
      calibration: result.calibration,
    };
  } catch (err) {
    error("submitFeedback error", err, { uid: request.auth.uid });
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", "Failed to submit feedback.");
  }
});

exports.getPendingFeedbackPrompt = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Please sign in to view your forecast feedback prompt.");
  }

  const uid = request.auth.uid;
  let targetClusterId = request.data?.clusterId;
  let language = request.data?.languageCode;

  try {
    if (!targetClusterId || !language) {
      const userDoc = await db.collection("users").doc(uid).get();
      const userProfile = userDoc.exists ? userDoc.data() : null;
      targetClusterId = targetClusterId || userProfile?.location?.cluster?.clusterId || "tirunelveli";
      language = language || userProfile?.preferredLanguage || "en";
    }

    const yesterdayStr = getISTDateString(-1);
    const trackDocRef = db.collection("forecast_tracks").doc(`${targetClusterId}_${yesterdayStr}`);
    const trackSnap = await trackDocRef.get();

    if (!trackSnap.exists) return null;
    const trackData = trackSnap.data() || {};
    if (trackData.final?.predictedRain == null || trackData.final?.rainProbability == null) return null;

    // Return prompt only if this uid has not already voted on this date
    const feedbackDocRef = db.collection("feedback").doc(`${uid}_${targetClusterId}_${yesterdayStr}`);
    const feedbackSnap = await feedbackDocRef.get();
    if (feedbackSnap.exists) return null;

    const rainProb = trackData.final.rainProbability ?? 0;
    const isTamil = language === "ta";
    const dayName = new Date(`${yesterdayStr}T00:00:00+05:30`).toLocaleDateString(isTamil ? "ta-IN" : "en-US", {
      weekday: "long",
      timeZone: "Asia/Kolkata",
    });
    const prediction = trackData.final.predictedRain
      ? isTamil ? "மழை" : "rain"
      : isTamil ? "வறண்ட வானிலை" : "dry weather";
    const predictionSummary = isTamil
      ? `${trackData.districtName || targetClusterId} பகுதியில் ${dayName} அன்று ${rainProb}% மழை வாய்ப்புடன் ${prediction} என்று கணித்தோம். அந்த முன்னறிவிப்பு சரியாக இருந்ததா?`
      : `We predicted ${prediction} for ${dayName} in ${trackData.districtName || targetClusterId} with a ${rainProb}% chance of rain. Was that forecast accurate?`;

    return {
      forecastId: `${targetClusterId}_${yesterdayStr}`,
      clusterId: targetClusterId,
      forecastDate: yesterdayStr,
      rainProbability: rainProb,
      weatherCondition: isTamil
        ? trackData.final.predictedRain ? "மழை முன்னறிவிப்பு" : "வறண்ட வானிலை முன்னறிவிப்பு"
        : trackData.final.predictedRain ? "rain forecast" : "dry forecast",
      predictionSummary,
    };
  } catch (err) {
    error("getPendingFeedbackPrompt error", err, { uid: request.auth.uid });
    throw new HttpsError("internal", "Failed to load pending feedback prompt.");
  }
});

// ---------------------------------------------------------------------------
// 4. aggregateTrustScores — Scheduled nightly calibration at 02:00 IST (Spec §32)
// ---------------------------------------------------------------------------
exports.aggregateTrustScores = onSchedule(
  { schedule: "every day 02:00", timeZone: "Asia/Kolkata" },
  async () => {
    info("Starting nightly trust score aggregation job...");
    await recalibrateAllClustersNightly();
  }
);

// ---------------------------------------------------------------------------
// 4b. snapshotForecasts & verifyForecasts — Scheduled Self-Grading Engine (Spec Section 2)
// ---------------------------------------------------------------------------
exports.snapshotForecasts = onSchedule(
  { schedule: "30 0,6,12,18 * * *", timeZone: "Asia/Kolkata" },
  async () => {
    info("Starting scheduled snapshotForecasts job...");
    await runSnapshotForecasts();
  }
);

exports.verifyForecasts = onSchedule(
  { schedule: "every day 06:00", timeZone: "Asia/Kolkata" },
  async () => {
    info("Starting scheduled verifyForecasts job...");
    await runVerifyForecasts();
  }
);

// ---------------------------------------------------------------------------
// 5. checkAlerts — Scheduled weather check for active extreme weather (Spec §33, §35)
// ---------------------------------------------------------------------------
exports.checkAlerts = onSchedule(
  { schedule: "every 60 minutes", secrets: [twilioAccountSid, twilioAuthToken] },
  async () => {
    info("Checking weather thresholds for active users...");
    const usersSnap = await db.collection("users").limit(100).get();

    for (const userDoc of usersSnap.docs) {
      const user = userDoc.data();
      if (!user.location?.latitude || !user.location?.longitude) continue;

      try {
        const weather = await getWeather(user.location.latitude, user.location.longitude, user.preferredLanguage || "en");
        const detected = detectSevereWeather(weather);
        const relevant = filterAlertsForUser(detected, user.role || "farmer");

        if (relevant.length > 0) {
          const topAlert = relevant[0];
          const personalized = buildPersonalizedAlert(topAlert, user.role, user.preferredLanguage || "en");

          await sendFcmAlert({
            userTokens: user.fcmToken ? [user.fcmToken] : [],
            title: personalized.title,
            body: personalized.body,
            alertData: topAlert,
          });

          if (user.contactPhoneNumber) {
            await new SmsAdapter().send(
              user.contactPhoneNumber,
              `${personalized.title}: ${personalized.body}`
            );
          }

          // Log alert delivery
          await db.collection("alert_deliveries").add({
            uid: userDoc.id,
            alert: topAlert,
            title: personalized.title,
            body: personalized.body,
            deliveredAt: new Date(),
          });
        }
      } catch (err) {
        warn("Error checking alerts for user", { uid: userDoc.id, error: err.message });
      }
    }
  }
);

// ---------------------------------------------------------------------------
// 6. triggerDemoAlert — Hackathon Demo Mode simulated alert (Spec §45)
// ---------------------------------------------------------------------------
exports.triggerDemoAlert = onCall(
  { invoker: ["public"], secrets: [twilioAccountSid, twilioAuthToken] },
  async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required");

  const { alertType = "heavy_rain" } = request.data || {};
  const supportedAlertTypes = ["heavy_rain", "high_wind", "extreme_heat"];
  if (!supportedAlertTypes.includes(alertType)) {
    throw new HttpsError(
      "invalid-argument",
      `Unsupported alertType. Expected one of: ${supportedAlertTypes.join(", ")}.`
    );
  }

  const uid = request.auth.uid;
  const userSnap = await db.collection("users").doc(uid).get();
  const user = userSnap.exists ? userSnap.data() : {};
  const role = user.role || "farmer";
  const language = user.preferredLanguage || "en";
  const mockWeather = {
    rainfallMm: alertType === "heavy_rain" ? 38 : 0,
    rainProbability: alertType === "heavy_rain" ? 95 : 10,
    windSpeedKmh: alertType === "high_wind" ? 48 : 12,
    temperatureC: alertType === "extreme_heat" ? 41 : 32,
    officialWarnings: [{
      type: alertType,
      severity: "high",
      title: `${alertType} demo alert`,
      description: `Simulated ${alertType.replace("_", " ")} warning for the live demo.`,
      tamilDescription: `நேரடி விளக்கத்திற்கான ${alertType.replace("_", " ")} மாதிரி எச்சரிக்கை.`,
      isOfficialWarning: true,
    }],
  };

  const detected = detectSevereWeather(mockWeather);
  const relevant = filterAlertsForUser(detected, role);
  const alert = detected[0] || null;

  if (relevant.length === 0) {
    const delivery = {
      fcm: {
        attempted: false,
        success: false,
        reason: `Alert type '${alertType}' is not relevant to the '${role}' role`,
      },
    };

    await db.collection("alert_deliveries").add({
      uid,
      alert,
      role,
      location: user.location || null,
      channels: user.channels || null,
      phoneNumber: user.phoneNumber || null,
      isDemo: true,
      filteredOut: true,
      delivery,
      deliveredAt: new Date(),
    });

    return {
      isDemo: true,
      alert,
      personalized: null,
      delivery,
      filteredOut: true,
      message: `The ${alertType} alert was filtered out because it is not relevant to the ${role} role.`,
    };
  }

  const relevantAlert = relevant[0];
  const personalized = buildPersonalizedAlert(relevantAlert, role, language);
  const hasFcmToken = Boolean(user.fcmToken);
  const pwaEnabled = user.channels?.pwa !== false;
  const fcmDelivery = {
    attempted: false,
    success: false,
    reason: "FCM token not registered",
  };

  if (!hasFcmToken) {
    fcmDelivery.reason = "FCM token not registered";
  } else if (!pwaEnabled) {
    fcmDelivery.reason = "PWA notifications disabled";
  } else {
    fcmDelivery.attempted = true;
    try {
      const result = await sendFcmAlert({
        userTokens: [user.fcmToken],
        title: personalized.title,
        body: personalized.body,
        alertData: relevantAlert,
      });
      fcmDelivery.success = result.sentCount > 0;
      fcmDelivery.reason = fcmDelivery.success
        ? "FCM notification sent"
        : result.error || "FCM notification failed";
    } catch (err) {
      fcmDelivery.reason = err.message || "FCM notification failed";
    }
  }

  const contactPhoneNumber = typeof user.contactPhoneNumber === "string"
    ? user.contactPhoneNumber.trim()
    : "";
  const smsPhoneNumber = /^\+[1-9]\d{7,14}$/.test(contactPhoneNumber)
    ? contactPhoneNumber
    : DEMO_SMS_FALLBACK_NUMBER;
  const smsDelivery = await new SmsAdapter().send(
    smsPhoneNumber,
    `${personalized.title}: ${personalized.body}`
  );
  info("Demo SMS delivery completed", {
    uid,
    status: smsDelivery.status,
    error: smsDelivery.error || null,
    errorCode: smsDelivery.errorCode || null,
    messageId: smsDelivery.messageId || null,
    accountSidSuffix: process.env.TWILIO_ACCOUNT_SID
      ? process.env.TWILIO_ACCOUNT_SID.slice(-6)
      : null,
    hasAccountSid: Boolean(process.env.TWILIO_ACCOUNT_SID),
    hasAuthToken: Boolean(process.env.TWILIO_AUTH_TOKEN),
    hasFromNumber: Boolean(process.env.TWILIO_FROM_NUMBER),
    hasContentSid: Boolean(process.env.TWILIO_CONTENT_SID),
  });
  const delivery = { fcm: fcmDelivery, sms: smsDelivery };
  await db.collection("alert_deliveries").add({
    uid,
    alert: relevantAlert,
    title: personalized.title,
    body: personalized.body,
    role,
    location: user.location || null,
    channels: user.channels || null,
    phoneNumber: user.phoneNumber || null,
    contactPhoneNumber: user.contactPhoneNumber || null,
    isDemo: true,
    delivery,
    deliveredAt: new Date(),
  });

  return {
    isDemo: true,
    alert: relevantAlert,
    personalized,
    delivery,
  };
});

// ---------------------------------------------------------------------------
// 7. createUserProfile — User Profile Bootstrap / Update (Spec §6)
// ---------------------------------------------------------------------------
exports.createUserProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in first.");
  }

  const { role, preferredLanguage, location, district, channels, fcmToken, contactPhoneNumber } = request.data;
  const uid = request.auth.uid;
  const now = new Date();

  const lat = location?.latitude != null ? location.latitude : null;
  const lng = location?.longitude != null ? location.longitude : null;
  const cluster = resolveCluster(lat, lng, district || location?.district);

  const userRef = db.collection("users").doc(uid);
  const existing = await userRef.get();
  const existingProfile = existing.exists ? existing.data() : {};
  const profileData = {
    userId: uid,
    role: role || existingProfile.role || "farmer",
    preferredLanguage: preferredLanguage || existingProfile.preferredLanguage || "en",
    location: location
      ? {
          ...(existingProfile.location || {}),
          latitude: lat,
          longitude: lng,
          village: location.village || existingProfile.location?.village || null,
          taluk: location.taluk || existingProfile.location?.taluk || null,
          district: district || location.district || existingProfile.location?.district || cluster.displayName,
          state: location.state || existingProfile.location?.state || "Tamil Nadu",
          country: location.country || existingProfile.location?.country || "India",
          cluster,
        }
      : existingProfile.location || null,
    channels: channels || existingProfile.channels || {
      pwa: true,
      voice: false,
      whatsapp: false,
      sms: false,
    },
    fcmToken: fcmToken !== undefined ? fcmToken : existingProfile.fcmToken || null,
    contactPhoneNumber: contactPhoneNumber !== undefined
      ? String(contactPhoneNumber)
      : existingProfile.contactPhoneNumber || null,
    phoneNumber: existingProfile.phoneNumber || request.auth.token.phone_number || null,
    updatedAt: now,
  };

  if (!existing.exists) {
    profileData.createdAt = now;
  }

  await userRef.set(profileData, { merge: true });
  info("User profile updated", { uid, role: profileData.role, district: profileData.location.district });

  return { success: true, profile: profileData };
});
