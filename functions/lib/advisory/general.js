// advisory/general.js — Advisory Rules for General Public and Researchers (Spec §18)

const GENERAL_RULES = {
  role: "general",
  title: "General Public Weather Advisory",
  rules: [
    {
      condition: "rainProbability >= 70 || rainfallMm >= 10",
      advisory: [
        "Rain looks likely, so keep an umbrella or raincoat handy when you go out.",
        "You may want to carry rain protection today because showers are quite likely.",
        "There is a good chance of rain. Plan your trip with an umbrella or raincoat nearby.",
      ],
      tamilAdvisory: "மழை பெய்ய அதிக வாய்ப்புள்ளதால் வெளியே செல்லும்போது குடை அல்லது மழைக்கோட் எடுத்துச் செல்லவும்.",
    },
    {
      condition: "temperatureC >= 38",
      advisory: [
        "It will be hot. Drink plenty of water, avoid the midday sun, and wear light clothing.",
        "High heat is expected, so stay hydrated and try to avoid direct sun from noon to 3 PM.",
        "Keep cool today with water, light cotton clothes, and less time in the afternoon sun.",
      ],
      tamilAdvisory: "வெயில் அதிகமாக இருப்பதால் அதிகளவு தண்ணீர் குடிக்கவும், நண்பகல் 12 முதல் 3 மணி வரை வெளியே செல்வதைத் தவிர்க்கவும்.",
    },
    {
      condition: "windSpeedKmh >= 35",
      advisory: [
        "Strong winds may make travel tricky. Ride carefully and stay away from loose branches.",
        "Take care on two-wheelers today, and avoid standing near trees or anything that could come loose.",
        "Gusty weather is expected, so slow down on the road and choose sheltered places when possible.",
      ],
      tamilAdvisory: "பலத்த காற்று வீசுவதால் இருசக்கர வாகனங்களில் செல்லும்போது எச்சரிக்கையாக இருக்கவும்.",
    },
    {
      condition: "default",
      advisory: [
        "The weather looks comfortable for travel and outdoor activities.",
        "Conditions look calm, so your usual outdoor plans should be fine.",
        "It is a good day for normal travel and outdoor activities, with no major weather concern showing.",
      ],
      tamilAdvisory: "வானிலை இனிமையாகவும் தெளிவாகவும் உள்ளதால் பயணங்கள் மற்றும் வெளிப்புறப் பணிகளுக்கு ஏற்றதாக உள்ளது.",
    },
  ],
};

function getGeneralAdvisory(weather, lang = "en") {
  const rainProb = weather.tomorrow?.rainProbability || weather.rainProbability || 0;
  const rainfall = weather.tomorrow?.rainfallMm || weather.rainfallMm || 0;
  const temp = weather.temperatureC || 30;
  const wind = weather.tomorrow?.windSpeedKmh || weather.windSpeedKmh || 0;

  const choose = (rule) => {
    const selected = lang === "ta" ? rule.tamilAdvisory : rule.advisory;
    const options = Array.isArray(selected) ? selected : [selected];
    return options[Math.floor(Math.random() * options.length)];
  };
  if (rainProb >= 70 || rainfall >= 10) {
    return choose(GENERAL_RULES.rules[0]);
  }
  if (temp >= 38) {
    return choose(GENERAL_RULES.rules[1]);
  }
  if (wind >= 35) {
    return choose(GENERAL_RULES.rules[2]);
  }
  return choose(GENERAL_RULES.rules[3]);
}

module.exports = { GENERAL_RULES, getGeneralAdvisory };
