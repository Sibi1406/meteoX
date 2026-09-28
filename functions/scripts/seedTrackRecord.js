// scripts/seedTrackRecord.js — Seed 30-day sample track record for hackathon demos (Spec Section 2)
const { db } = require("../admin");
const { getISTDateString } = require("../lib/feedback/schedulerJobs");

async function seedTrackRecord(clusterId = "tirunelveli", districtName = "Tirunelveli") {
  console.log(`Seeding 30-day demo track record for ${districtName} (${clusterId})...`);

  const days = [];
  const now = new Date();
  let autoHits = 0;
  let autoTotal = 0;
  let farmerHits = 0;
  let farmerTotal = 0;

  const batch = db.batch();

  // Create 30 days of realistic history ending yesterday
  for (let i = 30; i >= 1; i--) {
    const dateStr = getISTDateString(-i);
    const isFarmer = i % 4 === 0; // every 4th day is farmer verified
    const predictedRain = (i % 3 === 0) || (i % 7 === 0);
    // 80% accuracy
    const hit = i % 5 !== 0;
    const rained = hit ? predictedRain : !predictedRain;
    const source = isFarmer ? "farmer" : "model-analysis";

    if (source === "farmer") {
      farmerTotal++;
      if (hit) farmerHits++;
    } else {
      autoTotal++;
      if (hit) autoHits++;
    }

    const dayRecord = {
      date: dateStr,
      predictedRain,
      rained,
      hit,
      source,
    };
    days.push(dayRecord);

    // Also write forecast_tracks doc for realism
    const trackRef = db.collection("forecast_tracks").doc(`${clusterId}_${dateStr}`);
    batch.set(trackRef, {
      clusterId,
      districtName,
      targetDate: dateStr,
      history: [
        {
          issuedAt: new Date(now.getTime() - (i + 1) * 86400000).toISOString(),
          rainProbability: predictedRain ? 75 : 15,
          rainfallMm: predictedRain ? 8.5 : 0,
          predictedRain,
        },
      ],
      final: {
        issuedAt: new Date(now.getTime() - (i + 1) * 86400000).toISOString(),
        rainProbability: predictedRain ? 75 : 15,
        predictedRain,
      },
      verification: {
        status: "verified",
        observedRainMm: rained ? 6.2 : 0,
        rained,
        hit,
        source,
        verifiedAt: new Date(now.getTime() - i * 86400000).toISOString(),
      },
      farmer: {
        yes: source === "farmer" && rained ? 3 : 0,
        no: source === "farmer" && !rained ? 2 : 0,
      },
      isDemo: true,
    }, { merge: true });
  }

  const totalHits = autoHits + farmerHits;
  const totalDays = autoTotal + farmerTotal;
  const hitRate = Math.round((totalHits / totalDays) * 100);

  const trackRecord = {
    windowDays: 30,
    days,
    autoHits,
    autoTotal,
    farmerHits,
    farmerTotal,
    hits: totalHits,
    total: totalDays,
    hitRate,
    isDemo: true,
    updatedAt: new Date().toISOString(),
  };

  const trustRef = db.collection("trust_scores").doc(clusterId);
  batch.set(trustRef, {
    clusterId,
    trackRecord,
    isDemo: true,
  }, { merge: true });

  await batch.commit();

  console.log(`Successfully seeded 30-day demo track record for ${clusterId}:`);
  console.log(`- Hit rate: ${hitRate}% (${totalHits}/${totalDays})`);
  console.log(`- Auto verified: ${autoHits}/${autoTotal}`);
  console.log(`- Farmer verified: ${farmerHits}/${farmerTotal}`);
  console.log(`- isDemo: true`);
}

if (require.main === module) {
  const targetCluster = process.argv[2] || "tirunelveli";
  seedTrackRecord(targetCluster)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error seeding track record:", err);
      process.exit(1);
    });
}

module.exports = { seedTrackRecord };
