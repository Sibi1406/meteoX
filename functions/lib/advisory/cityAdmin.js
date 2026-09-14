// advisory/cityAdmin.js — Advisory Rules for Municipal & Urban Administrators (Spec §18)

const CITY_ADMIN_RULES = {
  role: "city_admin",
  title: "Municipal & Urban Operations Advisory",
  rules: [
    {
      condition: "rainfallMm >= 25 && rainProbability >= 80",
      advisory: [
        "Heavy rain could cause waterlogging. Prepare pumps and inspect storm-water drains now.",
        "With intense rain likely, place dewatering teams on standby and check the main drains.",
        "Flooding may develop in low areas, so ready pumps and clear critical storm-water channels.",
      ],
      tamilAdvisory: "நகர்ப்புறங்களில் மழைநீர் தேங்கும் அபாயம் உள்ளதால் கழிவுநீர் கால்வாய்களை தூர்வாரி தயார் நிலையில் வைக்கவும்.",
    },
    {
      condition: "rainfallMm >= 5 || rainProbability >= 60",
      advisory: [
        "Rain is likely. Clear storm drains, watch low-lying areas, and keep response teams ready.",
        "Prepare for local pooling by checking drains and monitoring vulnerable streets as rain develops.",
        "Some rain is expected, so inspect drainage points and keep an eye on areas that collect water.",
      ],
      tamilAdvisory: "மழை பெய்ய வாய்ப்புள்ளதால் மழைநீர் வடிகால்களை சுத்தம் செய்து தாழ்வான பகுதிகளை கண்காணிக்கவும்.",
    },
    {
      condition: "temperatureC >= 39",
      advisory: [
        "High heat is expected. Keep public water points open and issue heat-safety notices.",
        "Prepare for extreme heat by checking drinking-water stations and informing residents about precautions.",
        "Hot conditions may affect residents, so activate water kiosks and share heat-wave guidance.",
      ],
      tamilAdvisory: "கடும் வெப்ப அலை வீசுவதால் பொது குடிநீர் வசதிகளை உறுதிசெய்து பாதுகாப்பு வழிகாட்டுதல்களை வெளியிடவும்.",
    },
    {
      condition: "windSpeedKmh >= 35",
      advisory: [
        "Strong winds are possible. Inspect roadside signs and remove hazardous branches near power lines.",
        "Prepare for gusty weather by checking hoardings and trees that could threaten roads or cables.",
        "Wind may damage loose structures, so inspect signs and trim dangerous branches before conditions worsen.",
      ],
      tamilAdvisory: "பலத்த காற்று வீசக்கூடும் என்பதால் விளம்பரப் பலகைகள் மற்றும் ஆபத்தான மரக்கிளைகளை அகற்றவும்.",
    },
    {
      condition: "default",
      advisory: [
        "Urban conditions look normal, so routine sanitation, maintenance, and traffic work can continue.",
        "No major municipal weather concern is showing; regular city operations can proceed.",
        "The city can follow its normal schedule today while teams continue routine monitoring.",
      ],
      tamilAdvisory: "நகர வானிலை இயல்பாக உள்ளது. வழக்கமான தூய்மைப் பணிகள் மற்றும் பராமரிப்புப் பணிகளைத் தொடரலாம்.",
    },
  ],
};

function getCityAdminAdvisory(weather, lang = "en") {
  const rainfall = weather.tomorrow?.rainfallMm || weather.rainfallMm || 0;
  const rainProb = weather.tomorrow?.rainProbability || weather.rainProbability || 0;
  const temp = weather.temperatureC || 30;
  const wind = weather.tomorrow?.windSpeedKmh || weather.windSpeedKmh || 0;

  const choose = (rule) => {
    const selected = lang === "ta" ? rule.tamilAdvisory : rule.advisory;
    const options = Array.isArray(selected) ? selected : [selected];
    return options[Math.floor(Math.random() * options.length)];
  };
  if (rainfall >= 25 && rainProb >= 80) {
    return choose(CITY_ADMIN_RULES.rules[0]);
  }
  if (rainfall >= 5 || rainProb >= 60) {
    return choose(CITY_ADMIN_RULES.rules[1]);
  }
  if (temp >= 39) {
    return choose(CITY_ADMIN_RULES.rules[2]);
  }
  if (wind >= 35) {
    return choose(CITY_ADMIN_RULES.rules[3]);
  }
  return choose(CITY_ADMIN_RULES.rules[4]);
}

module.exports = { CITY_ADMIN_RULES, getCityAdminAdvisory };
