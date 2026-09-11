// ai/grounding.js — Grounding Verification Engine (Spec §22)
const { info, warn } = require("../utils/logger");

/**
 * Checks all numbers and key assertions in Gemini response against retrieved context.
 * Rejects hallucinated numbers, fabricated rain probabilities, or invented trust scores.
 */
function verifyGrounding(responseJson, context) {
  const failures = [];
  if (!responseJson || typeof responseJson !== "object") {
    return { passed: false, failures: ["Response is not a valid JSON object"] };
  }

  const { weatherFacts = [], advisory = [], localTrust = {}, answer = "" } = responseJson;
  const contextStr = JSON.stringify(context);
  const contextWeather = context.weather || {};
  const targetForecast = contextWeather.targetForecast || {};
  const contextTrust = context.localTrust;

  // 1. Verify Trust Score claim
  if (localTrust && localTrust.trustScore != null) {
    if (!contextTrust || contextTrust.trustScore == null) {
      failures.push("Hallucinated trust score when no local trust score exists in context");
    } else {
      const claimedStr = String(localTrust.trustScore).replace(/[% ]/g, "");
      const claimedScore = parseFloat(claimedStr);
      const actualScore = Number(contextTrust.trustScore);
      // Allow minor decimal rounding difference (e.g. 0.81 vs 81%)
      const match =
        !isNaN(claimedScore) &&
        (Math.abs(claimedScore - actualScore) < 0.05 ||
         Math.abs(claimedScore - actualScore * 100) < 5 ||
         Math.abs(claimedScore / 100 - actualScore) < 0.05);
      if (!match) {
        failures.push(`Trust score mismatch: claimed ${claimedScore}, context has ${actualScore}`);
      }
    }
  }

  // 2. Scan answer and weather facts for percentage claims (Rain probability)
  const fullText = [answer, ...weatherFacts, ...advisory].join(" ");
  
  // Extract all percentages in the text: e.g. "80%", "80 percent"
  const percentMatches = fullText.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|சதவீதம்)/gi) || [];
  for (const m of percentMatches) {
    const num = parseFloat(m);
    if (!isNaN(num)) {
      // Check if this percentage exists anywhere in context (rain probability, humidity, trust score)
      const validPercentages = [
        contextWeather.rainProbability,
        contextWeather.humidityPercent,
        targetForecast.rainProbability,
        contextTrust ? Math.round(contextTrust.accuracyScore * 100) : null,
        contextTrust ? Math.round(contextTrust.trustScore * 100) : null,
      ].filter((x) => x != null);

      const isFound = validPercentages.some((vp) => Math.abs(vp - num) <= 2);
      if (!isFound) {
        failures.push(`Unverified percentage claim in response: ${m}`);
      }
    }
  }

  // 3. Scan for temperature values: e.g. "29°C", "29 °C", "29 degrees", "29டிகிரி"
  const tempMatches = fullText.match(/(\d+(?:\.\d+)?)\s*(?:°C|deg|degree|டிகிரி)/gi) || [];
  for (const m of tempMatches) {
    const num = parseFloat(m);
    if (!isNaN(num)) {
      const validTemps = [
        contextWeather.temperatureC,
        targetForecast.temperatureMaxC,
        targetForecast.temperatureMinC,
      ].filter((x) => x != null);

      const isFound = validTemps.some((vt) => Math.abs(vt - num) <= 2);
      if (!isFound) {
        failures.push(`Unverified temperature claim: ${m}`);
      }
    }
  }

  // 4. Scan for rainfall amounts: e.g. "12 mm", "12 மி.மீ"
  const rainMmMatches = fullText.match(/(\d+(?:\.\d+)?)\s*(?:mm|மில்லிமீட்டர்|மி\.மீ)/gi) || [];
  for (const m of rainMmMatches) {
    const num = parseFloat(m);
    if (!isNaN(num)) {
      const validMm = [
        contextWeather.rainfallMm,
        targetForecast.rainfallMm,
      ].filter((x) => x != null);

      const isFound = validMm.some((vm) => Math.abs(vm - num) <= 2);
      if (!isFound) {
        failures.push(`Unverified rainfall amount: ${m}`);
      }
    }
  }

  if (failures.length > 0) {
    warn("Grounding verification FAILED", { failures });
    return { passed: false, failures };
  }

  info("Grounding verification PASSED");
  return { passed: true, failures: [] };
}

module.exports = { verifyGrounding };
