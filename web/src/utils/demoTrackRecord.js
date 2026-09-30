const DAY_MS = 24 * 60 * 60 * 1000;

export function buildDemoTrackRecord(now = new Date()) {
  const days = [];
  let autoHits = 0;
  let autoTotal = 0;
  let farmerHits = 0;
  let farmerTotal = 0;

  for (let offset = 30; offset >= 1; offset--) {
    const predictedRain = offset % 3 === 0 || offset % 7 === 0;
    const hit = offset % 5 !== 0;
    const source = offset % 4 === 0 ? "farmer" : "model-analysis";
    const date = new Date(now.getTime() - offset * DAY_MS).toISOString().slice(0, 10);

    if (source === "farmer") {
      farmerTotal++;
      if (hit) farmerHits++;
    } else {
      autoTotal++;
      if (hit) autoHits++;
    }

    days.push({
      date,
      predictedRain,
      rained: hit ? predictedRain : !predictedRain,
      hit,
      source,
    });
  }

  const hits = autoHits + farmerHits;
  const total = days.length;

  return {
    windowDays: 30,
    days,
    autoHits,
    autoTotal,
    farmerHits,
    farmerTotal,
    hits,
    total,
    hitRate: Math.round((hits / total) * 100),
    isDemo: true,
    updatedAt: now.toISOString(),
  };
}