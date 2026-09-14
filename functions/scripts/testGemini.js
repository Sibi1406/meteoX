// Diagnostic only: isolated Gemini client check.
const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { generateAdvisoryText, GEMINI_SYSTEM_PROMPT } = require("../lib/ai/gemini");

async function main() {
  const prompt = `${GEMINI_SYSTEM_PROMPT}\n\nQuestion: What is the current weather advisory for a farmer?`;
  try {
    const response = await generateAdvisoryText(prompt);
    console.log("Gemini response:");
    console.log(response);
  } catch (err) {
    console.error("Gemini diagnostic failed:");
    console.error("err.message:", err?.message);
    console.error("err.status:", err?.status);
    console.error("err.stack:", err?.stack);
    console.error("full error:", err);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Gemini diagnostic setup failed:");
  console.error("err.message:", err?.message);
  console.error("err.status:", err?.status);
  console.error("err.stack:", err?.stack);
  console.error("full error:", err);
  process.exitCode = 1;
});
