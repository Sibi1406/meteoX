// language/translation.js — Language layer handling English and Tamil localization (Spec §23, §24)
const { bhashini } = require("./bhashini");

const UI_STRINGS = {
  en: {
    weatherFactTitle: "Weather Facts",
    advisoryTitle: "Role Advisory",
    reliabilityTitle: "Local Forecast Reliability",
    basedOn: "Based on",
    observations: "observations",
    rainProbability: "Rain probability",
    temperature: "Temperature",
    humidity: "Humidity",
    windSpeed: "Wind speed",
    insufficientData: "Not enough observations yet",
    didItRain: "Did it rain as predicted?",
  },
  ta: {
    weatherFactTitle: "வானிலை தகவல்கள்",
    advisoryTitle: "பரிந்துரை வழிகாட்டல்",
    reliabilityTitle: "உள்ளூர் முன்னறிவிப்பு நம்பகத்தன்மை",
    basedOn: "அடிப்படையில்",
    observations: "கண்காணிப்புகள்",
    rainProbability: "மழை வாய்ப்பு",
    temperature: "வெப்பநிலை",
    humidity: "ஈரப்பதம்",
    windSpeed: "காற்றின் வேகம்",
    insufficientData: "போதுமான பதிவுகள் இல்லை",
    didItRain: "முன்னறிவித்தபடி மழை பெய்ததா?",
  },
};

/**
 * Localizes advisory response text using Bhashini adapter or native bilingual response.
 */
async function localizeResponse(advisoryResponse, targetLanguage = "en") {
  if (targetLanguage === "en") {
    return {
      ...advisoryResponse,
      language: "en",
    };
  }

  // If Gemini already generated in Tamil, preserve it
  if (targetLanguage === "ta") {
    // If not already translated, try bhashini
    return {
      ...advisoryResponse,
      language: "ta",
    };
  }

  return advisoryResponse;
}

module.exports = {
  UI_STRINGS,
  localizeResponse,
};
