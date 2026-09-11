// advisory/fisherman.js — Advisory Rules for Coastal Fishermen (Spec §18)

const FISHERMAN_RULES = {
  role: "fisherman",
  title: "Fisherman Coastal & Marine Advisory",
  rules: [
    {
      condition: "windSpeedKmh >= 38",
      advisory: "Squally wind conditions expected over the sea. Fishermen are strongly advised not to venture into deep sea waters.",
      tamilAdvisory: "கடலில் பலத்த காற்று வீசக்கூடும் என்பதால் மீனவர்கள் ஆழ்கடலுக்குள் செல்ல வேண்டாம் என்று எச்சரிக்கப்படுகிறார்கள்.",
    },
    {
      condition: "rainProbability >= 75",
      advisory: "Heavy cloudiness and sudden squalls likely. Keep boats secured and monitor local port signal updates.",
      tamilAdvisory: "திடீர் பலத்த காற்று மற்றும் மழைக்கு வாய்ப்புள்ளதால் படகுகளைப் பாதுகாப்பாக நிறுத்தி துறைமுக எச்சரிக்கையைக் கவனிக்கவும்.",
    },
    {
      condition: "default",
      advisory: "Sea conditions are calm and normal. Safe for routine near-shore and artisanal fishing operations.",
      tamilAdvisory: "கடல் அமைதியாகவும் சாதாரணமாகவும் உள்ளதால் வழக்கமான மீன்பிடி தொழிலை மேற்கொள்ளலாம்.",
    },
  ],
};

function getFishermanAdvisory(weather, lang = "en") {
  const wind = weather.tomorrow?.windSpeedKmh || weather.windSpeedKmh || 0;
  const rainProb = weather.tomorrow?.rainProbability || weather.rainProbability || 0;

  if (wind >= 38) {
    return lang === "ta" ? FISHERMAN_RULES.rules[0].tamilAdvisory : FISHERMAN_RULES.rules[0].advisory;
  }
  if (rainProb >= 75) {
    return lang === "ta" ? FISHERMAN_RULES.rules[1].tamilAdvisory : FISHERMAN_RULES.rules[1].advisory;
  }
  return lang === "ta" ? FISHERMAN_RULES.rules[2].tamilAdvisory : FISHERMAN_RULES.rules[2].advisory;
}

module.exports = { FISHERMAN_RULES, getFishermanAdvisory };
