const { CACHE_TTL_MINUTES } = require("../config");

const CACHE_TTL_MS = CACHE_TTL_MINUTES * 60 * 1000;

async function getOrGenerateDashboardAdvisory({
  dbInstance,
  clusterId,
  role,
  language,
  generate,
  now = Date.now(),
}) {
  const cacheId = [clusterId, role, language].map(encodeURIComponent).join("_");
  const cacheRef = dbInstance.collection("dashboard_advisory_cache").doc(cacheId);
  const cacheSnap = await cacheRef.get();
  const cached = cacheSnap.exists ? cacheSnap.data() : null;
  const generatedAt = cached?.generatedAt?.toMillis?.()
    ?? (cached?.generatedAt ? new Date(cached.generatedAt).getTime() : NaN);

  if (
    cached?.advisory &&
    Number.isFinite(generatedAt) &&
    now >= generatedAt &&
    now - generatedAt < CACHE_TTL_MS
  ) {
    return { advisory: cached.advisory, fromCache: true };
  }

  const advisory = await generate();
  await cacheRef.set({ advisory, generatedAt: new Date(now).toISOString() }, { merge: true });
  return { advisory, fromCache: false };
}

module.exports = { getOrGenerateDashboardAdvisory };