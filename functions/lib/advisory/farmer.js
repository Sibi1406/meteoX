// advisory/farmer.js — Agricultural Advisory Rules for Farmers (Spec §18)

const FARMER_RULES = {
  role: "farmer",
  title: "Farmer Agricultural Advisory",
  rules: [
    {
      condition: "rainProbability >= 60 || rainfallMm >= 5",
      advisory: [
        "Rain is on the way, so wait before applying fertilizer or pesticide to avoid washing it off.",
        "It is better to postpone fertilizer and pesticide work because the expected rain may carry them away.",
        "Hold off on spraying or fertilizing for now; the rain could waste the treatment and nutrients.",
      ],
      tamilAdvisory: "எதிர்பார்க்கப்படும் மழையால் சத்துக்கள் அடித்துச் செல்லப்படலாம் என்பதால் உரம் மற்றும் பூச்சிக்கொல்லி இடுவதை தள்ளிப்போடவும்.",
    },
    {
      condition: "rainfallMm >= 15",
      advisory: [
        "Skip irrigation for now to reduce waterlogging and protect the crop roots.",
        "The field may already get enough water, so postpone irrigation and let the soil drain.",
        "Wait on watering the field today to avoid excess moisture around the roots.",
      ],
      tamilAdvisory: "வயலில் நீர் தேங்குவதைத் தடுக்கவும் பயிரின் வேரழுகலைத் தவிர்க்கவும் பாசனத்தை ஒத்திவைக்கவும்.",
    },
    {
      condition: "windSpeedKmh >= 25",
      advisory: [
        "Avoid spraying in this wind because the treatment can drift away from the crop.",
        "Strong winds are expected, so wait before spraying pesticides or liquid nutrients.",
        "Postpone spraying until the wind eases to keep the treatment on the plants.",
      ],
      tamilAdvisory: "பலத்த காற்று வீசும்போது பூச்சிக்கொல்லி மருந்து தெளிப்பதைத் தவிர்க்கவும், இல்லையெனில் மருந்து வீணாகும்.",
    },
    {
      condition: "temperatureC >= 37",
      advisory: [
        "Water the crops in the early morning or evening to reduce heat stress and evaporation.",
        "With high temperatures ahead, choose cooler hours for irrigation and protect the crops from heat.",
        "Avoid midday watering; early morning or late evening will be easier on the crops.",
      ],
      tamilAdvisory: "அதிக வெப்பம் நிலவுவதால், நீர் ஆவியாவதைத் தடுக்க அதிகாலை அல்லது மாலை வேளையில் பாசனம் செய்யவும்.",
    },
    {
      condition: "default",
      advisory: [
        "The weather looks suitable for routine fieldwork and crop checks.",
        "Conditions are favorable for normal farming activities and monitoring the crop.",
        "You can continue regular fieldwork today, while keeping an eye on the crop.",
      ],
      tamilAdvisory: "வானிலை சீராக உள்ளதால் வழக்கமான விவசாயப் பணிகள் மற்றும் களப்பணிகளை மேற்கொள்ளலாம்.",
    },
  ],
};

function getFarmerAdvisory(weather, lang = "en") {
  const rainProb = weather.tomorrow?.rainProbability || weather.rainProbability || 0;
  const rainfall = weather.tomorrow?.rainfallMm || weather.rainfallMm || 0;
  const wind = weather.tomorrow?.windSpeedKmh || weather.windSpeedKmh || 0;
  const temp = weather.temperatureC || 30;

  const choose = (rule) => {
    const options = lang === "ta" ? rule.tamilAdvisory : rule.advisory;
    return (Array.isArray(options) ? options : [options])[Math.floor(Math.random() * (Array.isArray(options) ? options.length : 1))];
  };
  if (rainProb >= 60 || rainfall >= 5) {
    return choose(FARMER_RULES.rules[0]);
  }
  if (rainfall >= 15) {
    return choose(FARMER_RULES.rules[1]);
  }
  if (wind >= 25) {
    return choose(FARMER_RULES.rules[2]);
  }
  if (temp >= 37) {
    return choose(FARMER_RULES.rules[3]);
  }
  return choose(FARMER_RULES.rules[4]);
}

module.exports = { FARMER_RULES, getFarmerAdvisory };
