// scripts/cleanupDatabase.js - Manual Firestore maintenance utility.
// Dry-run by default. Every destructive run requires --confirm and --project.

const { execFileSync } = require("node:child_process");
const { createRequire } = require("node:module");
const functionsRequire = createRequire(require.resolve("../functions/package.json"));
const { initializeApp } = functionsRequire("firebase-admin/app");
const { getFirestore } = functionsRequire("firebase-admin/firestore");

const PAGE_SIZE = 400;
const BATCH_SIZE = 400;
const DEFAULT_STALE_MINUTES = 60;
const deletionSummary = new Map();
const SCHEMA_AUDIT = [
  ["weather_cache", "active read/write", ["functions/lib/weather/cache.js"], ["functions/lib/weather/cache.js"]],
  ["forecast_records", "write-only candidate; do not delete automatically", [], ["functions/lib/weather/cache.js", "scripts/seedDemoData.js"]],
  ["weather_observations", "write-only candidate; do not delete automatically", [], ["functions/lib/feedback/feedback.js"]],
  ["role_rules", "active read/write; auto-seeds defaults", ["functions/lib/advisory/roleRules.js", "functions/lib/rag/retrieval.js"], ["functions/lib/advisory/roleRules.js", "scripts/seedDemoData.js"]],
];

function usage() {
  console.log(`Usage:
  node scripts/cleanupDatabase.js --project <id>
  node scripts/cleanupDatabase.js --project <id> --confirm
  node scripts/cleanupDatabase.js --project <id> --only demo,query-logs

Options:
  --confirm                    Delete matched documents. Omit for dry-run.
  --project <id>               Required; must match GCLOUD_PROJECT or firebase use.
  --only <targets>             demo, query-logs, weather-cache, test-users.
  --older-than-minutes <n>     Weather cache threshold. Default: 60.
  --test-phones <a,b,c>        Auth testing phone numbers.
`);
}

function parseArgs(argv) {
  const args = { confirm: false, only: null, olderThanMinutes: DEFAULT_STALE_MINUTES, testPhones: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--confirm") args.confirm = true;
    else if (arg === "--project") args.project = argv[++i];
    else if (arg === "--only") args.only = argv[++i]?.split(",").map((x) => x.trim()).filter(Boolean);
    else if (arg === "--older-than-minutes") args.olderThanMinutes = Number(argv[++i]);
    else if (arg === "--test-phones") args.testPhones = argv[++i]?.split(",").map((x) => x.trim()).filter(Boolean) || [];
    else if (arg === "--help" || arg === "-h") { usage(); process.exit(0); }
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.testPhones = [...new Set([...args.testPhones, ...(process.env.TEST_PHONE_NUMBERS || "").split(",").map((x) => x.trim()).filter(Boolean)])];
  if (!args.project) throw new Error("Missing required --project <id>.");
  if (!Number.isFinite(args.olderThanMinutes) || args.olderThanMinutes <= 0) throw new Error("--older-than-minutes must be positive.");
  return args;
}

function configuredProject() {
  const envProject = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (envProject) return envProject;
  try {
    const output = execFileSync("firebase", ["use"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return output.match(/(?:active\s+project|project)\s*:?\s*([a-z0-9][a-z0-9-]+)/i)?.[1] || null;
  } catch {
    return null;
  }
}

function assertProject(project) {
  const active = configuredProject();
  if (!active) throw new Error("Cannot verify project. Set GCLOUD_PROJECT or configure `firebase use`.");
  if (active !== project) throw new Error(`Project mismatch: --project is '${project}', active project is '${active}'. Aborting.`);
  console.log(`Firebase project: ${project}`);
}

function timestampMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

async function scanQuery(query, onPage) {
  let pageQuery = query.limit(PAGE_SIZE);
  let total = 0;
  while (true) {
    const snapshot = await pageQuery.get();
    if (snapshot.empty) break;
    await onPage(snapshot.docs);
    total += snapshot.size;
    if (snapshot.size < PAGE_SIZE) break;
    pageQuery = query.startAfter(snapshot.docs[snapshot.docs.length - 1]).limit(PAGE_SIZE);
  }
  return total;
}

async function deleteDocuments(label, docs, confirm) {
  if (!docs.length) return 0;
  if (!confirm) return docs.length;
  let deleted = 0;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    docs.slice(i, i + BATCH_SIZE).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += Math.min(BATCH_SIZE, docs.length - i);
  }
  deletionSummary.set(label, (deletionSummary.get(label) || 0) + deleted);
  return deleted;
}

function report(collection, docs, label) {
  console.log(`${label}: ${docs.length} document(s) in ${collection}`);
  console.log(`  sample IDs: ${docs.slice(0, 3).map((doc) => doc.id).join(", ") || "none"}`);
}

async function cleanupDemoData(confirm) {
  console.log("\n[cleanupDemoData]");
  let total = 0;
  for (const collection of await db.listCollections()) {
    const docs = [];
    await scanQuery(collection.where("isDemo", "==", true), async (page) => docs.push(...page));
    if (!docs.length) continue;
    report(collection.id, docs, "Demo data");
    total += await deleteDocuments(`cleanupDemoData/${collection.id}`, docs, confirm);
  }
  if (!total) console.log("No demo documents found.");
  return total;
}

function fingerprint(data) {
  return JSON.stringify({ uid: data.uid || null, query: data.query || null, createdAt: timestampMillis(data.createdAt) });
}

async function deduplicateQueryLogs(confirm) {
  console.log("\n[deduplicateQueryLogs]");
  const logs = [];
  await scanQuery(db.collection("query_logs"), async (page) => logs.push(...page));
  if (!logs.length) { console.log("query_logs: no documents found."); return 0; }
  const equivalent = new Map();
  await scanQuery(db.collection("queries"), async (page) => {
    page.forEach((doc) => {
      const key = fingerprint(doc.data());
      equivalent.set(key, (equivalent.get(key) || 0) + 1);
    });
  });
  const unmatched = [];
  for (const doc of logs) {
    const key = fingerprint(doc.data());
    const count = equivalent.get(key) || 0;
    if (count) equivalent.set(key, count - 1); else unmatched.push(doc.id);
  }
  report("query_logs", logs, "Duplicate logs");
  console.log(`  equivalent queries matched: ${logs.length - unmatched.length}/${logs.length}`);
  if (unmatched.length) { console.log(`  NOT deleting ${unmatched.length} unmatched document(s): ${unmatched.slice(0, 3).join(", ")}`); return 0; }
  return deleteDocuments("deduplicateQueryLogs/query_logs", logs, confirm);
}

async function pruneStaleWeatherCache(olderThanMinutes = DEFAULT_STALE_MINUTES, confirm) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60000);
  console.log(`\n[pruneStaleWeatherCache] createdAt older than ${cutoff.toISOString()}`);
  console.log("  Actual source schema uses createdAt/expiresAt, not fetchedAt/expireAt.");
  console.log("  TTL policy status is not available from this script; verify Firebase Console > Firestore > TTL policies.");
  const docs = [];
  await scanQuery(db.collection("weather_cache").where("createdAt", "<", cutoff), async (page) => docs.push(...page));
  report("weather_cache", docs, "Stale cache");
  return deleteDocuments("pruneStaleWeatherCache/weather_cache", docs, confirm);
}

async function pruneOrphanedTestUsers(testPhones, confirm) {
  console.log("\n[pruneOrphanedTestUsers]");
  if (!testPhones.length) { console.log("Skipped: provide --test-phones or TEST_PHONE_NUMBERS."); return 0; }
  const docsById = new Map();
  for (const phone of testPhones) await scanQuery(db.collection("users").where("phoneNumber", "==", phone), async (page) => page.forEach((doc) => docsById.set(doc.id, doc)));
  const docs = [...docsById.values()];
  console.log(`Testing phone numbers: ${testPhones.join(", ")}`);
  report("users", docs, "Orphaned test users");
  return deleteDocuments("pruneOrphanedTestUsers/users", docs, confirm);
}

function printAudit() {
  console.log("\n[collection audit]");
  for (const [collection, status, reads, writes] of SCHEMA_AUDIT) {
    console.log(`- ${collection}: ${status}`);
    console.log(`  reads: ${reads.join(", ") || "none found"}`);
    console.log(`  writes: ${writes.join(", ") || "none found"}`);
  }
  console.log("- forecast_records and weather_observations are flagged as write-only candidates; they are not deleted automatically.");
}

let db;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertProject(args.project);
  db = getFirestore(initializeApp({ projectId: args.project }));
  console.log(args.confirm ? "MODE: CONFIRM - matching documents will be deleted" : "MODE: DRY-RUN - no documents will be deleted");
  printAudit();
  const targets = new Set(args.only || ["demo", "query-logs", "weather-cache", "test-users"]);
  const supported = new Set(["demo", "query-logs", "weather-cache", "test-users"]);
  const unknown = [...targets].filter((target) => !supported.has(target));
  if (unknown.length) throw new Error(`Unknown --only target(s): ${unknown.join(", ")}`);
  if (targets.has("demo")) await cleanupDemoData(args.confirm);
  if (targets.has("query-logs")) await deduplicateQueryLogs(args.confirm);
  if (targets.has("weather-cache")) await pruneStaleWeatherCache(args.olderThanMinutes, args.confirm);
  if (targets.has("test-users")) await pruneOrphanedTestUsers(args.testPhones, args.confirm);
  if (args.confirm) {
    console.log("\nDeletion summary:");
    if (!deletionSummary.size) console.log("- No documents deleted.");
    for (const [label, count] of deletionSummary) console.log(`- ${label}: ${count}`);
  } else {
    console.log("\nDry-run complete. Review the output before rerunning with --confirm.");
  }
}

main().catch((error) => {
  console.error(`\nCleanup aborted: ${error.message}`);
  process.exitCode = 1;
});

module.exports = { cleanupDemoData, deduplicateQueryLogs, pruneStaleWeatherCache, pruneOrphanedTestUsers };
