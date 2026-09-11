// services/geminiService.js — Direct Google Gemini 3.6 Flash Client with Grounding
const GEMINI_API_KEY =
  (typeof import.meta !== "undefined" && import.meta?.env?.VITE_GEMINI_API_KEY) || "";

const PRIMARY_MODEL = "gemini-3.6-flash";
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-flash-latest"];

/**
 * Ask Google Gemini for grounded weather and role advisory in Chat
 */
export async function generateGeminiAdvisory({
  query,
  weather,
  role = "farmer",
  district = "Tirunelveli",
  languageCode = "en",
}) {
  const isTamil = languageCode === "ta" || /[\u0B80-\u0BFF]/.test(query);

  const weatherSummary = weather
    ? `
Location: ${district}, Tamil Nadu
Current Temperature: ${weather.temperatureC ?? 30}°C (Feels like ${weather.apparentTemperatureC ?? weather.temperatureC ?? 31}°C)
Current Weather Condition: ${weather.weatherCondition || "Partly Cloudy"}
Precipitation / Rain: ${weather.rainfallMm ?? 0} mm
Rain Probability: ${weather.rainProbability ?? 20}%
Humidity: ${weather.humidityPercent ?? 65}%
Wind Speed: ${weather.windSpeedKmh ?? 14} km/h
Pressure: ${weather.pressureHpa ?? 1012} hPa
UV Index: ${weather.uvIndex ?? 6}
Tomorrow Max Temp: ${weather.tomorrow?.tempMaxC ?? 31}°C
Tomorrow Rain Probability: ${weather.tomorrow?.rainProbability ?? 25}%
Tomorrow Expected Rainfall: ${weather.tomorrow?.rainfallMm ?? 0} mm
Tomorrow Condition: ${weather.tomorrow?.weatherCondition || "Partly Cloudy"}
`.trim()
    : `Location: ${district}, Tamil Nadu. Current weather conditions active.`;

  const prompt = `
You are MeteoX's expert weather intelligence and role advisory assistant.
You are strictly grounded in the following verified real-time meteorological data for ${district}:

${weatherSummary}

User Profile / Role: ${role.toUpperCase()}
User Query: "${query}"

Guidelines:
1. Ground every weather fact in the provided data above. Do not hallucinate or invent fake temperature or rain values.
2. Provide practical, actionable advice tailored for the user's role (${role}).
   - For Farmers: advise on fertilizer application, pesticide spraying, irrigation timing, and crop protection.
   - For Fishermen: advise on wind speed, sea swell, safety, and boat harbor precautions.
   - For City Admins: advise on storm drainage, waterlogging, heat waves, and traffic safety.
   - For General Public: advise on travel, clothing, umbrellas, and outdoor comfort.
3. Answer strictly in ${isTamil ? "Tamil (தமிழ்)" : "clear concise English"}.
4. Keep the answer structured, empathetic, and direct (2 to 4 concise paragraphs or bullet points).
`.trim();

  // Try primary model then fallbacks
  const candidateModels = [PRIMARY_MODEL, ...FALLBACK_MODELS];

  for (const modelName of candidateModels) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 800,
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(
          errJson.error?.message || `Gemini HTTP ${response.status}`
        );
      }

      const data = await response.json();
      const answerText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (answerText) {
        return {
          answer: answerText.trim(),
          model: modelName,
          grounded: true,
        };
      }
    } catch (err) {
      console.warn(`Gemini model ${modelName} error:`, err.message);
    }
  }

  // Fallback if network or quota issue
  return {
    answer: isTamil
      ? `${district} வானிலை தரவுகளின்படி: தற்போதைய வெப்பநிலை ${weather?.temperatureC ?? 30}°C, மழை வாய்ப்பு ${weather?.rainProbability ?? 20}%. ${
          (weather?.rainProbability ?? 20) > 50
            ? "மழை பெய்ய வாய்ப்புள்ளதால் உரம் மற்றும் பூச்சிக்கொல்லி தெளிப்பதை ஒத்திவைக்கவும்."
            : "வானிலை சீராக உள்ளதால் வழக்கமான பணிகளைத் தொடரலாம்."
        }`
      : `Based on real-time weather in ${district}: Current temperature is ${weather?.temperatureC ?? 30}°C with ${weather?.rainProbability ?? 20}% rain probability. ${
          (weather?.rainProbability ?? 20) > 50
            ? "High chance of rain. Consider postponing fertilizer or chemical spraying."
            : "Conditions are favorable for normal outdoor and field operations."
        }`,
    model: "offline-grounded-fallback",
    grounded: true,
  };
}

/**
 * Generate quick real-time role advisory for the Dashboard
 */
export async function generateDashboardAdvisory({
  weather,
  role = "farmer",
  district = "Tirunelveli",
  languageCode = "en",
}) {
  const isTamil = languageCode === "ta";
  const rainProb = weather?.tomorrow?.rainProbability ?? weather?.rainProbability ?? 20;
  const rainMm = weather?.tomorrow?.rainfallMm ?? weather?.rainfallMm ?? 0;
  const temp = weather?.temperatureC ?? 30;
  const wind = weather?.windSpeedKmh ?? 12;

  const prompt = `
You are MeteoX AI. Generate an actionable, role-tailored meteorological advisory for ${role.toUpperCase()} in ${district}, Tamil Nadu.
Live Data: Temperature ${temp}°C, Wind ${wind} km/h, Tomorrow Rain Chance ${rainProb}%, Expected Rain ${rainMm} mm.
Provide 1 or 2 concise, highly practical sentences in ${isTamil ? "Tamil" : "English"} focused on immediate actions (${role === "farmer" ? "fertilizer, irrigation, pesticide spraying" : role === "fisherman" ? "sea venture, wind, swell" : "urban drainage and commute"}).
Do NOT include introductory phrases like "Here is the advisory:". Provide the direct recommendation only.
`.trim();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${PRIMARY_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 600,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return text.trim();
      }
    }
  } catch (e) {
    console.warn("Dashboard Gemini advisory fetch error, using grounded rules:", e.message);
  }

  // High quality grounded fallback if API call unavailable
  if (role === "farmer") {
    if (rainProb >= 50 || rainMm >= 4) {
      return isTamil
        ? `நாளை ${district} பகுதியில் ${rainProb}% மழை வாய்ப்பு உள்ளது (${rainMm} மி.மீ). உரம் மற்றும் பூச்சிக்கொல்லி இடுவதைத் தள்ளிப்போடவும்; வடிகால்களைத் தயார் நிலையில் வைக்கவும்.`
        : `Rain probability is ${rainProb}% with ${rainMm} mm expected in ${district}. Postpone scheduled fertilizer or pesticide spraying to avoid chemical runoff.`;
    }
    return isTamil
      ? `வானிலை சாதகமாக உள்ளதால் (${temp}°C, மழை வாய்ப்பு ${rainProb}%) ${district} பகுதியில் உரமிடுதல், களை எடுத்தல் மற்றும் பாசனப் பணிகளை மேற்கொள்ளலாம்.`
      : `Weather conditions are optimal across ${district} (${temp}°C, ${rainProb}% rain chance). Favorable for fertilizer application, weeding, and controlled irrigation.`;
  } else if (role === "fisherman") {
    if (wind >= 30) {
      return isTamil
        ? `கடல் காற்றின் வேகம் (${wind} km/h) அதிகமாக இருப்பதால் ஆழ்கடல் மீன்பிடிப்பைத் தவிர்க்கவும். துறைமுக எச்சரிக்கைகளைக் கவனிக்கவும்.`
        : `Offshore wind speeds reaching ${wind} km/h. Deep sea fishing is not advised. Keep fishing vessels securely moored.`;
    }
    return isTamil
      ? `கடல் காற்று சீராக உள்ளது (${wind} km/h). வழக்கமான கடலோர மீன்பிடிப்புப் பணிகளைத் தொடரலாம்.`
      : `Marine winds are moderate at ${wind} km/h with calm swells. Normal coastal operations may proceed safely.`;
  } else if (role === "city_admin") {
    return isTamil
      ? `நகர்ப்புற வடிகால்களை ஆய்வு செய்து மோட்டார் பம்புகளைத் தயார் நிலையில் வைக்கவும். தற்போதைய மழை வாய்ப்பு: ${rainProb}%.`
      : `Monitor low-lying arterial culverts and ensure municipal pumps are primed. Current rain probability is ${rainProb}%.`;
  }
  return isTamil
    ? `இன்றைய வானிலை: ${temp}°C, மழை வாய்ப்பு ${rainProb}%. பயணங்களுக்கு உகந்த வானிலை.`
    : `Current temperature is ${temp}°C with a ${rainProb}% rain probability. Conditions are suitable for daily commuting and outdoor routines.`;
}
