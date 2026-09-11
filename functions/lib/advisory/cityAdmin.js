// advisory/cityAdmin.js — Advisory Rules for Municipal & Urban Administrators (Spec §18)

const CITY_ADMIN_RULES = {
  role: "city_admin",
  title: "Municipal & Urban Operations Advisory",
  rules: [
    {
      condition: "rainfallMm >= 25 || rainProbability >= 80",
      advisory: "High risk of localized urban waterlogging. Pre-position dewatering pumps and inspect storm water drain culverts.",
      tamilAdvisory: "நகர்ப்புறங்களில் மழைநீர் தேங்கும் அபாயம் உள்ளதால் கழிவுநீர் கால்வாய்களை தூர்வாரி தயார் நிலையில் வைக்கவும்.",
    },
    {
      condition: "temperatureC >= 39",
      advisory: "Extreme heat advisory. Ensure public drinking water kiosks are operational and deploy heat-wave safety notices.",
      tamilAdvisory: "கடும் வெப்ப அலை வீசுவதால் பொது குடிநீர் வசதிகளை உறுதிசெய்து பாதுகாப்பு வழிகாட்டுதல்களை வெளியிடவும்.",
    },
    {
      condition: "windSpeedKmh >= 35",
      advisory: "Strong winds predicted. Inspect roadside hoardings, pruning hazardous tree branches near power lines.",
      tamilAdvisory: "பலத்த காற்று வீசக்கூடும் என்பதால் விளம்பரப் பலகைகள் மற்றும் ஆபத்தான மரக்கிளைகளை அகற்றவும்.",
    },
    {
      condition: "default",
      advisory: "Urban conditions are normal. Routine sanitation, civil maintenance, and municipal traffic can proceed as scheduled.",
      tamilAdvisory: "நகர வானிலை இயல்பாக உள்ளது. வழக்கமான தூய்மைப் பணிகள் மற்றும் பராமரிப்புப் பணிகளைத் தொடரலாம்.",
    },
  ],
};

function getCityAdminAdvisory(weather, lang = "en") {
  const rainfall = weather.tomorrow?.rainfallMm || weather.rainfallMm || 0;
  const rainProb = weather.tomorrow?.rainProbability || weather.rainProbability || 0;
  const temp = weather.temperatureC || 30;
  const wind = weather.tomorrow?.windSpeedKmh || weather.windSpeedKmh || 0;

  if (rainfall >= 25 || rainProb >= 80) {
    return lang === "ta" ? CITY_ADMIN_RULES.rules[0].tamilAdvisory : CITY_ADMIN_RULES.rules[0].advisory;
  }
  if (temp >= 39) {
    return lang === "ta" ? CITY_ADMIN_RULES.rules[1].tamilAdvisory : CITY_ADMIN_RULES.rules[1].advisory;
  }
  if (wind >= 35) {
    return lang === "ta" ? CITY_ADMIN_RULES.rules[2].tamilAdvisory : CITY_ADMIN_RULES.rules[2].advisory;
  }
  return lang === "ta" ? CITY_ADMIN_RULES.rules[3].tamilAdvisory : CITY_ADMIN_RULES.rules[3].advisory;
}

module.exports = { CITY_ADMIN_RULES, getCityAdminAdvisory };
