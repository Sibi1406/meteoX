// ai/grounding.js — Grounding Verification Engine (Spec §22)
const { info, warn } = require("../utils/logger");

function parseClockMinutes(hour, minute, meridiem = null, dayPart = null) {
  let normalizedHour = Number(hour);
  const normalizedMinute = Number(minute || 0);
  if (normalizedHour > 23 || normalizedMinute > 59) return null;
  if (meridiem) {
    normalizedHour %= 12;
    if (meridiem.toLowerCase() === "pm") normalizedHour += 12;
  } else if (dayPart) {
    if (dayPart === "மதியம்" || dayPart === "மாலை" || dayPart === "இரவு") normalizedHour = normalizedHour % 12 + 12;
  }
  return normalizedHour * 60 + normalizedMinute;
}

function responseClockMinutes(text) {
  const found = [];
  const meridiemPattern = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi;
  const tamilPattern = /(காலை|மதியம்|மாலை|இரவு)\s*(\d{1,2})(?::(\d{2}))?/g;
  const twentyFourHourPattern = /\b(\d{1,2}):(\d{2})\b/g;
  let match;

  while ((match = meridiemPattern.exec(text))) {
    found.push(parseClockMinutes(match[1], match[2], match[3]));
  }
  while ((match = tamilPattern.exec(text))) {
    found.push(parseClockMinutes(match[2], match[3], null, match[1]));
  }
  while ((match = twentyFourHourPattern.exec(text))) {
    found.push(parseClockMinutes(match[1], match[2]));
  }
  return found.filter((value) => value != null);
}

function contextClockMinutes(context) {
  const windows = context.weather?.actionWindows || [];
  const found = [];
  for (const window of windows) {
    for (const timestamp of [window.startISO, window.endISO]) {
      if (!timestamp) continue;
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) continue;
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(date);
      const hour = Number(parts.find((part) => part.type === "hour")?.value);
      const minute = Number(parts.find((part) => part.type === "minute")?.value);
      found.push(hour * 60 + minute);
    }
  }
  return found;
}

/**
 * Checks all numbers and key assertions in Gemini response against retrieved context.
 * Rejects hallucinated numbers, fabricated rain probabilities, or invented trust scores.
 */
function verifyGrounding(responseJson, context) {
  const failures = [];
  if (!responseJson || typeof responseJson !== "object") {
    return { passed: false, failures: ["Response is not a valid JSON object"] };
  }

  const { facts = [], localTrust = {} } = responseJson;
  const contextStr = JSON.stringify(context);
  const contextWeather = context.weather || {};
  const targetForecast = contextWeather.targetForecast || {};
  const forecastDays = contextWeather.forecastDays || [];
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
  const fullText = [
    responseJson.headline,
    responseJson.action,
    ...facts.flatMap((fact) => [fact?.label, fact?.value]),
  ].filter(Boolean).join(" ");

  // Model-vote counts must match the deterministic agreement in context.
  const modelVoteMatches = fullText.match(/\b(\d+)\s+(?:of|out of)\s+(\d+)\s+models?\b/gi) || [];
  for (const claim of modelVoteMatches) {
    const [, votes, total] = claim.match(/(\d+)\s+(?:of|out of)\s+(\d+)\s+models?/i) || [];
    const agreement = contextWeather.modelAgreement;
    if (!agreement || Number(votes) !== agreement.rainVotes || Number(total) !== agreement.of) {
      failures.push(`Unverified model-vote claim: ${claim}`);
    }
  }
  const tamilModelVoteMatches = fullText.match(/(\d+)\s*(?:மாதிரிகளில்|மாடல்களில்)\s*(\d+)/g) || [];
  for (const claim of tamilModelVoteMatches) {
    const [, total, votes] = claim.match(/(\d+)\s*(?:மாதிரிகளில்|மாடல்களில்)\s*(\d+)/) || [];
    const agreement = contextWeather.modelAgreement;
    if (!agreement || Number(votes) !== agreement.rainVotes || Number(total) !== agreement.of) {
      failures.push(`Unverified model-vote claim: ${claim}`);
    }
  }

  // Clock times may only repeat endpoints of server-computed action windows.
  const claimedTimes = responseClockMinutes(fullText);
  if (claimedTimes.length) {
    const allowedTimes = contextClockMinutes(context);
    for (const time of claimedTimes) {
      if (!allowedTimes.includes(time)) {
        failures.push(`Unverified action-window time: ${time}`);
      }
    }
  }
  
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
        ...forecastDays.map((day) => day.rainProbability),
        ...(contextWeather.modelAgreement?.models || []).map((m) => m.rainProbability),
        contextWeather.modelAgreement?.of
          ? Math.round((contextWeather.modelAgreement.rainVotes / contextWeather.modelAgreement.of) * 100)
          : null,
        ...(contextWeather.actionWindows || []).flatMap((w) =>
          (w.basis || []).filter((b) => b.unit === "%").map((b) => b.value)
        ),
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
        ...forecastDays.flatMap((day) => [day.tempMaxC, day.tempMinC]),
        ...(contextWeather.actionWindows || []).flatMap((w) =>
          (w.basis || []).filter((b) => b.unit === "°C").map((b) => b.value)
        ),
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
        ...forecastDays.map((day) => day.rainfallMm),
        ...(contextWeather.modelAgreement?.models || []).map((m) => m.rainMm),
        contextWeather.modelAgreement?.spreadMm,
        ...(contextWeather.actionWindows || []).flatMap((w) =>
          (w.basis || []).filter((b) => b.unit === "mm").map((b) => b.value)
        ),
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
