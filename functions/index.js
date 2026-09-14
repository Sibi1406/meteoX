// index.js — Cloud Functions entry point for WeatherGPT (Node.js 20)
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
const { evaluateRoleAdvisory } = require("./lib/advisory/roleRules");
const { recordUserFeedback } = require("./lib/feedback/feedback");
const { recalibrateAllClustersNightly } = require("./lib/feedback/calibration");
const { detectSevereWeather } = require("./lib/alerts/detection");
const { filterAlertsForUser } = require("./lib/alerts/vulnerability");
const { buildPersonalizedAlert, sendFcmAlert } = require("./lib/alerts/personalization");
const { resolveCluster, encode, districtPrefix } = require("./lib/utils/geo");
const { info, error } = require("./lib/utils/logger");

setGlobalOptions({ region: "asia-south1", maxInstances: 10 });

const geminiKey = defineSecret("GEMINI_API_KEY");
const bhashiniKey = defineSecret("BHASHINI_API_KEY");

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

      // Step 4: Direct factual response optimization (Spec §41)
      // If query is a simple factual check (e.g. "What is the temperature tomorrow?"),
      // answer directly without invoking Gemini LLM.
      let responsePayload;

      if (queryAnalysis.isFactualOnly) {
        const isTamil = language === "ta";
        const targetForecast = queryAnalysis.dateTime === "today" ? weather.today : weather.tomorrow;
        let directAnswer = "";

        if (queryAnalysis.intent === "temperature") {
          const t = targetForecast.tempMaxC || weather.temperatureC;
          directAnswer = isTamil
            ? `நாளை எதிர்பார்க்கப்படும் அதிகபட்ச வெப்பநிலை ${t}°C.`
            : `The forecast maximum temperature for tomorrow is ${t}°C.`;
        } else if (queryAnalysis.intent === "rainfall") {
          const r = targetForecast.rainProbability;
          directAnswer = isTamil
            ? `நாளை மழை பெய்வதற்கான வாய்ப்பு ${r}%.`
            : `The rain probability for tomorrow is ${r}%.`;
        } else if (queryAnalysis.intent === "wind") {
          const w = targetForecast.windSpeedKmh;
          directAnswer = isTamil
            ? `நாளை காற்றின் வேகம் மணிக்கு சுமார் ${w} கி.மீ.`
            : `The forecast wind speed for tomorrow is approximately ${w} km/h.`;
        }

        responsePayload = {
          weatherFacts: [
            isTamil ? `மழை வாய்ப்பு: ${targetForecast.rainProbability}%` : `Rain probability: ${targetForecast.rainProbability}%`,
            isTamil ? `வெப்பநிலை: ${targetForecast.tempMaxC}°C` : `Temperature: ${targetForecast.tempMaxC}°C`,
            isTamil ? `காற்றின் வேகம்: ${targetForecast.windSpeedKmh} km/h` : `Wind speed: ${targetForecast.windSpeedKmh} km/h`,
          ],
          advisory: [evaluateRoleAdvisory(effectiveRole, weather, language)],
          localTrust: localTrust
            ? {
                trustScore: `${Math.round((localTrust.trustScore || 0.8) * 100)}%`,
                sampleCount: localTrust.sampleCount,
                confidenceLevel: localTrust.confidenceLevel,
              }
            : null,
          answer: directAnswer,
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

      // Step 6: Log query audit record to Firestore (Spec §14)
      const now = new Date();
      const logDoc = {
        uid: request.auth.uid,
        role: effectiveRole,
        query,
        queryIntent: queryAnalysis.intent,
        language,
        location: { latitude: targetLat, longitude: targetLng, cluster },
        weatherCondition: weather.weatherCondition,
        advisory: responsePayload,
        fromCache: weather.fromCache || false,
        createdAt: now,
      };

      const logRef = await db.collection("queries").add(logDoc);

      return {
        queryId: logRef.id,
        forecastId: `${encode(targetLat, targetLng, 6)}_${weather.tomorrow?.date || now.toISOString().split("T")[0]}`,
        advisory: responsePayload,
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
    const cluster = requestedCluster?.displayName
      ? requestedCluster
      : weather.location?.cluster || resolveCluster(lat, lng, district);
    weather.location = { ...weather.location, cluster };

    // Retrieve trust score for this cluster
    const trustDoc = await db.collection("trust_scores").doc(cluster.clusterId).get();
    const trustData = trustDoc.exists ? trustDoc.data() : null;

    // Detect any severe threshold alerts
    const severeAlerts = detectSevereWeather(weather);
    const relevantAlerts = filterAlertsForUser(severeAlerts, effectiveRole);

    // Get deterministic agricultural / role advisory
    const roleAdvisory = evaluateRoleAdvisory(effectiveRole, weather, lang);

    return {
      weather,
      cluster,
      roleAdvisory,
      trustScore: trustData
        ? {
            accuracyScore: trustData.accuracyScore,
            trustScore: trustData.trustScore,
            sampleCount: trustData.sampleCount || trustData.totalFeedback || 0,
            confidenceLevel: trustData.confidenceLevel || "low",
            regionalBias: trustData.regionalBias || 0,
            isDemo: Boolean(trustData.isDemo),
          }
        : null,
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

  const { forecastId, answer, predictedRain, lat, lng, role, forecastDate } = request.data;
  if (!answer || lat == null || lng == null) {
    throw new HttpsError("invalid-argument", "Missing answer (YES/NO) or location coordinates.");
  }

  try {
    const result = await recordUserFeedback({
      userId: request.auth.uid,
      forecastId,
      lat,
      lng,
      forecastDate,
      predictedRain: predictedRain != null ? predictedRain : true,
      answer, // "yes" or "no"
      role: role || "general",
    });

    return {
      success: true,
      message: "Feedback recorded and local calibration updated.",
      calibration: result.calibration,
    };
  } catch (err) {
    error("submitFeedback error", err, { uid: request.auth.uid });
    throw new HttpsError("internal", "Failed to submit feedback.");
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
// 5. checkAlerts — Scheduled weather check for active extreme weather (Spec §33, §35)
// ---------------------------------------------------------------------------
exports.checkAlerts = onSchedule(
  { schedule: "every 60 minutes" },
  async () => {
    info("Checking weather thresholds for active users...");
    const usersSnap = await db.collection("users").limit(100).get();

    for (const userDoc of usersSnap.docs) {
      const user = userDoc.data();
      if (!user.location?.latitude || !user.location?.longitude || !user.fcmToken) continue;

      try {
        const weather = await getWeather(user.location.latitude, user.location.longitude, user.preferredLanguage || "en");
        const detected = detectSevereWeather(weather);
        const relevant = filterAlertsForUser(detected, user.role || "farmer");

        if (relevant.length > 0) {
          const topAlert = relevant[0];
          const personalized = buildPersonalizedAlert(topAlert, user.role, user.preferredLanguage || "en");

          await sendFcmAlert({
            userTokens: [user.fcmToken],
            title: personalized.title,
            body: personalized.body,
            alertData: topAlert,
          });

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
  { invoker: "public" },
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

  const delivery = { fcm: fcmDelivery };
  await db.collection("alert_deliveries").add({
    uid,
    alert: relevantAlert,
    title: personalized.title,
    body: personalized.body,
    role,
    location: user.location || null,
    channels: user.channels || null,
    phoneNumber: user.phoneNumber || null,
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

  const { role, preferredLanguage, location, district, channels, fcmToken } = request.data;
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
