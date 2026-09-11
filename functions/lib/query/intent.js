// query/intent.js — Intent definitions & keyword dictionaries for English and Tamil (Spec §8)

const INTENTS = {
  WEATHER_FORECAST: "weather_forecast",
  RAINFALL: "rainfall",
  TEMPERATURE: "temperature",
  WIND: "wind",
  HUMIDITY: "humidity",
  AGRICULTURAL_ADVISORY: "agricultural_advisory",
  FISHING_ADVISORY: "fishing_advisory",
  WEATHER_ALERT: "weather_alert",
  GENERAL_WEATHER: "general_weather",
};

// Keyword mapping for English and Tamil
const INTENT_KEYWORDS = {
  [INTENTS.RAINFALL]: {
    en: ["rain", "rainfall", "shower", "precipitation", "drizzle", "pour", "storm", "wet"],
    ta: ["மழை", "மழை பெய்யுமா", "மழையளவு", "சாரல்", "தூறல்", "மழைப்பொழிவு"],
  },
  [INTENTS.TEMPERATURE]: {
    en: ["temp", "temperature", "heat", "hot", "cold", "warm", "degrees", "celsius"],
    ta: ["வெப்பம்", "வெப்பநிலை", "சூடு", "குளிர்", "வெயில்"],
  },
  [INTENTS.WIND]: {
    en: ["wind", "wind speed", "breeze", "gust", "stormy", "cyclone", "gale"],
    ta: ["காற்று", "காற்றின் வேகம்", "சூறாவளி", "புயல்", "தென்றல்"],
  },
  [INTENTS.HUMIDITY]: {
    en: ["humidity", "humid", "moisture", "dew", "sweat"],
    ta: ["ஈரப்பதம்", "காற்றின் ஈரப்பதம்", "வியர்வை"],
  },
  [INTENTS.AGRICULTURAL_ADVISORY]: {
    en: [
      "fertilizer", "spray", "pesticide", "irrigation", "water the field",
      "sowing", "harvest", "crop", "farm", "urea", "manure", "cultivation"
    ],
    ta: [
      "உரம்", "உரம் போடலாமா", "பூச்சிக்கொல்லி", "தெளிக்கலாமா", "பாசனம்", "தண்ணீர் பாய்ச்சலாமா",
      "விதைக்கலாமா", "அறுவடை", "பயிர்", "விவசாயம்", "யூரியா"
    ],
  },
  [INTENTS.FISHING_ADVISORY]: {
    en: ["boat", "fishing", "sea", "sail", "harbor", "wave", "ocean", "tide", "catch"],
    ta: ["மீன்பிடிக்க", "கடல்", "படகு", "அலை", "வலை", "கடலுக்கு போகலாமா", "துறைமுகம்"],
  },
  [INTENTS.WEATHER_ALERT]: {
    en: ["alert", "warning", "danger", "cyclone", "flood", "emergency", "severe"],
    ta: ["எச்சரிக்கை", "ஆபத்து", "புயல் எச்சரிக்கை", "வெள்ளம்", "அபாயம்"],
  },
};

const DATE_KEYWORDS = {
  today: {
    en: ["today", "now", "currently", "this morning", "this afternoon", "tonight", "this evening"],
    ta: ["இன்று", "இன்னைக்கு", "இப்பொழுது", "இப்போ", "இன்று இரவு", "மாலை"],
  },
  tomorrow: {
    en: ["tomorrow", "tomorrow morning", "tomorrow evening", "next day"],
    ta: ["நாளை", "நாளைக்கு", "நாளை காலை", "நாளை மாலை"],
  },
  next_week: {
    en: ["next week", "this week", "upcoming days", "few days", "weekend"],
    ta: ["அடுத்த வாரம்", "இந்த வாரம்", "வார இறுதி"],
  },
};

module.exports = {
  INTENTS,
  INTENT_KEYWORDS,
  DATE_KEYWORDS,
};
