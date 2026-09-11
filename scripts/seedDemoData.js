// scripts/seedDemoData.js — Hackathon Demo Seed Script (Spec §44)
/**
 * Run via: node scripts/seedDemoData.js
 * Or against the Firebase Emulator:
 * FIRESTORE_EMULATOR_HOST="localhost:8080" node scripts/seedDemoData.js
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize Admin SDK (uses emulator if FIRESTORE_EMULATOR_HOST is set, or default credentials)
const app = initializeApp({
  projectId: process.env.GCLOUD_PROJECT || "meteox-9d084",
});
const db = getFirestore(app);

const DEMO_ROLE_RULES = {
  farmer: {
    role: "farmer",
    title: "Farmer Agricultural Advisory",
    rules: [
      {
        condition: "High rain probability + fertilizer query",
        advisory: "Consider delaying fertilizer application because significant rainfall is expected.",
        tamilAdvisory: "கனமழை எதிர்பார்க்கப்படுவதால் உரம் இடுவதை தள்ளிப்போடவும்.",
      },
      {
        condition: "Strong wind + spraying",
        advisory: "Avoid spraying pesticides during unsafe wind conditions to prevent chemical drift.",
        tamilAdvisory: "பலத்த காற்றின் போது பூச்சிக்கொல்லி மருந்து தெளிப்பதைத் தவிர்க்கவும்.",
      },
      {
        condition: "Heavy rainfall + irrigation",
        advisory: "Consider postponing irrigation to avoid waterlogging and protect root health.",
        tamilAdvisory: "மழை அதிகம் இருப்பதால் பயிர்களுக்கு பாசனம் செய்வதை ஒத்திவைக்கவும்.",
      },
      {
        condition: "Extreme heat",
        advisory: "Irrigate crops during early morning or evening hours to reduce heat stress.",
        tamilAdvisory: "வெப்பத் தணிப்பிற்காக அதிகாலை அல்லது மாலை வேளையில் பாசனம் செய்யவும்.",
      },
    ],
    isDemo: true,
    updatedAt: new Date(),
  },
  fisherman: {
    role: "fisherman",
    title: "Fisherman Coastal Advisory",
    rules: [
      {
        condition: "Strong wind >= 38 km/h",
        advisory: "Squally wind conditions expected over the sea. Avoid deep-sea fishing ventures.",
        tamilAdvisory: "கடலில் பலத்த காற்று வீசக்கூடும் என்பதால் ஆழ்கடலுக்குச் செல்ல வேண்டாம்.",
      },
      {
        condition: "High swell / squall",
        advisory: "Anchor and moor boats securely in the harbor and heed port warnings.",
        tamilAdvisory: "படகுகளை துறைமுகத்தில் பாதுகாப்பாக நிறுத்தி எச்சரிக்கையைக் கவனிக்கவும்.",
      },
    ],
    isDemo: true,
    updatedAt: new Date(),
  },
  city_admin: {
    role: "city_admin",
    title: "City Municipal Operations",
    rules: [
      {
        condition: "Heavy rain >= 25mm",
        advisory: "Inspect stormwater drains and position mobile dewatering pumps in low-lying areas.",
        tamilAdvisory: "தாழ்வான பகுதிகளில் மழைநீர் வெளியேற்றும் பம்புகளை தயார் நிலையில் வைக்கவும்.",
      },
      {
        condition: "Heatwave",
        advisory: "Activate public drinking water kiosks and issue heat advisories.",
        tamilAdvisory: "பொது இடங்களில் குடிநீர் வசதிகளைச் செய்து வெப்ப எச்சரிக்கைகளை வெளியிடவும்.",
      },
    ],
    isDemo: true,
    updatedAt: new Date(),
  },
  general: {
    role: "general",
    title: "General Public Weather Advisory",
    rules: [
      {
        condition: "Rain probability >= 70%",
        advisory: "High chance of rain. Carry an umbrella or raincoat when traveling.",
        tamilAdvisory: "மழை பெய்ய வாய்ப்புள்ளதால் வெளியே செல்லும்போது குடை எடுத்துச் செல்லவும்.",
      },
      {
        condition: "High UV / Heat",
        advisory: "Stay hydrated and avoid prolonged sun exposure during peak noon hours.",
        tamilAdvisory: "வெயில் அதிகமாக இருப்பதால் அதிகளவு தண்ணீர் குடிக்கவும்.",
      },
    ],
    isDemo: true,
    updatedAt: new Date(),
  },
  researcher: {
    role: "researcher",
    title: "Meteorological Research Advisory",
    rules: [
      {
        condition: "Observation tracking",
        advisory: "Evaluate local variance against numerical model forecast parameters.",
        tamilAdvisory: "வானிலை மாதிரி மாறிகளை உள்ளூர் அளவீடுகளுடன் ஒப்பிட்டு ஆராயவும்.",
      },
    ],
    isDemo: true,
    updatedAt: new Date(),
  },
};

const DEMO_TRUST_SCORES = [
  {
    clusterId: "coimbatore",
    clusterType: "district",
    accuracyScore: 0.81,
    regionalBias: 0.05,
    trustScore: 0.81,
    sampleCount: 42,
    confidenceLevel: "usable",
    isDemo: true,
    lastUpdated: new Date(),
    note: "Coimbatore agricultural cluster benchmark",
  },
  {
    clusterId: "chennai",
    clusterType: "district",
    accuracyScore: 0.78,
    regionalBias: -0.02,
    trustScore: 0.78,
    sampleCount: 28,
    confidenceLevel: "usable",
    isDemo: true,
    lastUpdated: new Date(),
    note: "Chennai coastal urban benchmark",
  },
  {
    clusterId: "madurai",
    clusterType: "district",
    accuracyScore: 0.85,
    regionalBias: 0.01,
    trustScore: 0.85,
    sampleCount: 56,
    confidenceLevel: "usable",
    isDemo: true,
    lastUpdated: new Date(),
    note: "Madurai south agricultural benchmark",
  },
  {
    clusterId: "thanjavur",
    clusterType: "district",
    accuracyScore: 0.83,
    regionalBias: 0.03,
    trustScore: 0.83,
    sampleCount: 39,
    confidenceLevel: "usable",
    isDemo: true,
    lastUpdated: new Date(),
    note: "Cauvery delta farming cluster benchmark",
  },
];

async function seed() {
  console.log("🌱 Starting WeatherGPT Demo Data Seeding...");

  // 1. Seed Role Rules
  console.log("\n📦 Seeding role_rules collection...");
  for (const [role, data] of Object.entries(DEMO_ROLE_RULES)) {
    await db.collection("role_rules").doc(role).set(data);
    console.log(`  ✓ role_rules/${role}`);
  }

  // 2. Seed Trust Scores
  console.log("\n🎯 Seeding trust_scores collection...");
  for (const score of DEMO_TRUST_SCORES) {
    await db.collection("trust_scores").doc(score.clusterId).set(score);
    console.log(`  ✓ trust_scores/${score.clusterId} (Accuracy: ${(score.accuracyScore * 100).toFixed(0)}%, Samples: ${score.sampleCount})`);
  }

  // 3. Seed Demo Forecast Record
  console.log("\n📅 Seeding demo forecast record...");
  const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  await db.collection("forecast_records").doc(`demo_coimbatore_${tomorrowStr}`).set({
    forecastId: `demo_coimbatore_${tomorrowStr}`,
    location: { latitude: 11.0168, longitude: 76.9558 },
    cluster: { clusterType: "district", clusterId: "coimbatore" },
    forecastDate: tomorrowStr,
    predictedRain: true,
    predictedRainfallMm: 12,
    rainProbability: 80,
    weatherCondition: "Light rain",
    generatedAt: new Date(),
    sources: ["open-meteo"],
    isDemo: true,
  });
  console.log(`  ✓ forecast_records/demo_coimbatore_${tomorrowStr}`);

  console.log("\n✅ Demo data seeding completed successfully!");
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
