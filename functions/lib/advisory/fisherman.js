// advisory/fisherman.js — Advisory Rules for Coastal Fishermen (Spec §18)

const FISHERMAN_RULES = {
  role: "fisherman",
  title: "Fisherman Coastal & Marine Advisory",
  rules: [
    {
      condition: "windSpeedKmh >= 38",
      advisory: [
        "Strong squalls may affect the sea, so avoid going into deep waters today.",
        "The sea could turn rough. It is safest to keep boats close to shore and avoid deep-sea trips.",
        "With strong winds expected offshore, postpone deep-sea fishing and wait for calmer conditions.",
      ],
      tamilAdvisory: "கடலில் பலத்த காற்று வீசக்கூடும் என்பதால் மீனவர்கள் ஆழ்கடலுக்குள் செல்ல வேண்டாம் என்று எச்சரிக்கப்படுகிறார்கள்.",
    },
    {
      condition: "rainProbability >= 75",
      advisory: [
        "Clouds and sudden squalls are possible. Secure the boat and follow local port updates.",
        "Unsettled weather may arrive quickly, so keep the boat tied safely and watch port signals.",
        "Keep your boat secure today and check the latest harbor guidance before heading out.",
      ],
      tamilAdvisory: "திடீர் பலத்த காற்று மற்றும் மழைக்கு வாய்ப்புள்ளதால் படகுகளைப் பாதுகாப்பாக நிறுத்தி துறைமுக எச்சரிக்கையைக் கவனிக்கவும்.",
    },
    {
      condition: "default",
      advisory: [
        "The sea looks calm for routine near-shore fishing, with normal care still advised.",
        "Conditions appear suitable for near-shore fishing. Keep monitoring the sea before and during the trip.",
        "No major weather concern is showing for routine coastal work, but stay alert to local updates.",
      ],
      tamilAdvisory: "கடல் அமைதியாகவும் சாதாரணமாகவும் உள்ளதால் வழக்கமான மீன்பிடி தொழிலை மேற்கொள்ளலாம்.",
    },
  ],
};

function getFishermanAdvisory(weather, lang = "en") {
  const wind = weather.tomorrow?.windSpeedKmh || weather.windSpeedKmh || 0;
  const rainProb = weather.tomorrow?.rainProbability || weather.rainProbability || 0;

  const choose = (rule) => {
    const selected = lang === "ta" ? rule.tamilAdvisory : rule.advisory;
    const options = Array.isArray(selected) ? selected : [selected];
    return options[Math.floor(Math.random() * options.length)];
  };
  if (wind >= 38) {
    return choose(FISHERMAN_RULES.rules[0]);
  }
  if (rainProb >= 75) {
    return choose(FISHERMAN_RULES.rules[1]);
  }
  return choose(FISHERMAN_RULES.rules[2]);
}

module.exports = { FISHERMAN_RULES, getFishermanAdvisory };
