// advisory/general.js — Advisory Rules for General Public and Researchers (Spec §18)

const GENERAL_RULES = {
  role: "general",
  title: "General Public Weather Advisory",
  rules: [
    {
      condition: "rainProbability >= 70 || rainfallMm >= 10",
      advisory: "High chance of rain. Remember to carry an umbrella or raincoat when stepping out.",
      tamilAdvisory: "மழை பெய்ய அதிக வாய்ப்புள்ளதால் வெளியே செல்லும்போது குடை அல்லது மழைக்கோட் எடுத்துச் செல்லவும்.",
    },
    {
      condition: "temperatureC >= 38",
      advisory: "Hot weather prevailing. Stay well-hydrated, avoid direct sun exposure between 12 PM and 3 PM, and wear light cotton clothes.",
      tamilAdvisory: "வெயில் அதிகமாக இருப்பதால் அதிகளவு தண்ணீர் குடிக்கவும், நண்பகல் 12 முதல் 3 மணி வரை வெளியே செல்வதைத் தவிர்க்கவும்.",
    },
    {
      condition: "windSpeedKmh >= 35",
      advisory: "Gusty winds expected. Exercise caution when commuting on two-wheelers and avoid standing under loose tree branches.",
      tamilAdvisory: "பலத்த காற்று வீசுவதால் இருசக்கர வாகனங்களில் செல்லும்போது எச்சரிக்கையாக இருக்கவும்.",
    },
    {
      condition: "default",
      advisory: "Weather is pleasant and clear. Suitable for outdoor travel, commute, and personal activities.",
      tamilAdvisory: "வானிலை இனிமையாகவும் தெளிவாகவும் உள்ளதால் பயணங்கள் மற்றும் வெளிப்புறப் பணிகளுக்கு ஏற்றதாக உள்ளது.",
    },
  ],
};

function getGeneralAdvisory(weather, lang = "en") {
  const rainProb = weather.tomorrow?.rainProbability || weather.rainProbability || 0;
  const rainfall = weather.tomorrow?.rainfallMm || weather.rainfallMm || 0;
  const temp = weather.temperatureC || 30;
  const wind = weather.tomorrow?.windSpeedKmh || weather.windSpeedKmh || 0;

  if (rainProb >= 70 || rainfall >= 10) {
    return lang === "ta" ? GENERAL_RULES.rules[0].tamilAdvisory : GENERAL_RULES.rules[0].advisory;
  }
  if (temp >= 38) {
    return lang === "ta" ? GENERAL_RULES.rules[1].tamilAdvisory : GENERAL_RULES.rules[1].advisory;
  }
  if (wind >= 35) {
    return lang === "ta" ? GENERAL_RULES.rules[2].tamilAdvisory : GENERAL_RULES.rules[2].advisory;
  }
  return lang === "ta" ? GENERAL_RULES.rules[3].tamilAdvisory : GENERAL_RULES.rules[3].advisory;
}

module.exports = { GENERAL_RULES, getGeneralAdvisory };
