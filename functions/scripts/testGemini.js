// Diagnostic only: isolated Gemini client check.
const path = require("node:path");
process.loadEnvFile(path.resolve(__dirname, "../.env"));

const { generateAdvisoryText } = require("../lib/ai/gemini");

async function main() {
  const prompt = 'Reply with exactly "Gemini connection OK". Do not provide weather information.';
  try {
    const response = await generateAdvisoryText(prompt);
    console.log("Gemini response:");
    console.log(response);
  } catch (err) {
    console.error("Gemini diagnostic failed:");
    console.error("status:", err?.status || "unavailable");
    console.error("code:", err?.code || "unavailable");
    console.error("message:", err?.message || "Unknown Gemini error");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Gemini diagnostic setup failed:");
  console.error("status:", err?.status || "unavailable");
  console.error("code:", err?.code || "unavailable");
  console.error("message:", err?.message || "Unknown diagnostic error");
  process.exitCode = 1;
});
