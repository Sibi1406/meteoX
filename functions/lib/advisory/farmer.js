// advisory/farmer.js — Agricultural Advisory Rules for Farmers (Spec §18)

const FARMER_RULES = {
  role: "farmer",
  title: "Farmer Agricultural Advisory",
  rules: [
    {
      condition: "rainProbability >= 60 || rainfallMm >= 5",
      advisory: "Delay fertilizer and pesticide application as upcoming rainfall will wash away nutrients and chemicals.",
      tamilAdvisory: "எதிர்பார்க்கப்படும் மழையால் சத்துக்கள் அடித்துச் செல்லப்படலாம் என்பதால் உரம் மற்றும் பூச்சிக்கொல்லி இடுவதை தள்ளிப்போடவும்.",
    },
    {
      condition: "rainfallMm >= 15",
      advisory: "Postpone field irrigation to prevent waterlogging and protect crop root aeration.",
      tamilAdvisory: "வயலில் நீர் தேங்குவதைத் தடுக்கவும் பயிரின் வேரழுகலைத் தவிர்க்கவும் பாசனத்தை ஒத்திவைக்கவும்.",
    },
    {
      condition: "windSpeedKmh >= 25",
      advisory: "Avoid spraying pesticides or liquid foliar nutrients during strong winds to prevent drift and chemical waste.",
      tamilAdvisory: "பலத்த காற்று வீசும்போது பூச்சிக்கொல்லி மருந்து தெளிப்பதைத் தவிர்க்கவும், இல்லையெனில் மருந்து வீணாகும்.",
    },
    {
      condition: "temperatureC >= 37",
      advisory: "High temperatures expected. Irrigate crops during early morning or late evening hours to reduce heat stress and evaporation.",
      tamilAdvisory: "அதிக வெப்பம் நிலவுவதால், நீர் ஆவியாவதைத் தடுக்க அதிகாலை அல்லது மாலை வேளையில் பாசனம் செய்யவும்.",
    },
    {
      condition: "default",
      advisory: "Weather conditions are favorable for regular farming, intercultural operations, and crop monitoring.",
      tamilAdvisory: "வானிலை சீராக உள்ளதால் வழக்கமான விவசாயப் பணிகள் மற்றும் களப்பணிகளை மேற்கொள்ளலாம்.",
    },
  ],
};

function getFarmerAdvisory(weather, lang = "en") {
  const rainProb = weather.tomorrow?.rainProbability || weather.rainProbability || 0;
  const rainfall = weather.tomorrow?.rainfallMm || weather.rainfallMm || 0;
  const wind = weather.tomorrow?.windSpeedKmh || weather.windSpeedKmh || 0;
  const temp = weather.temperatureC || 30;

  if (rainProb >= 60 || rainfall >= 5) {
    return lang === "ta" ? FARMER_RULES.rules[0].tamilAdvisory : FARMER_RULES.rules[0].advisory;
  }
  if (rainfall >= 15) {
    return lang === "ta" ? FARMER_RULES.rules[1].tamilAdvisory : FARMER_RULES.rules[1].advisory;
  }
  if (wind >= 25) {
    return lang === "ta" ? FARMER_RULES.rules[2].tamilAdvisory : FARMER_RULES.rules[2].advisory;
  }
  if (temp >= 37) {
    return lang === "ta" ? FARMER_RULES.rules[3].tamilAdvisory : FARMER_RULES.rules[3].advisory;
  }
  return lang === "ta" ? FARMER_RULES.rules[4].tamilAdvisory : FARMER_RULES.rules[4].advisory;
}

module.exports = { FARMER_RULES, getFarmerAdvisory };
