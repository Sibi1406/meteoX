// test/alerts.test.js — Unit tests for extreme weather detection and role filtering
const { describe, it } = require("node:test");
const assert = require("node:assert");
const { detectSevereWeather, calculateSeverity } = require("../lib/alerts/detection");
const { filterAlertsForUser } = require("../lib/alerts/vulnerability");
const { buildPersonalizedAlert } = require("../lib/alerts/personalization");

describe("Official Weather Alert System", () => {
  it("does not alert from forecast thresholds alone", () => {
    const weather = {
      rainfallMm: 22,
      rainProbability: 100,
      windSpeedKmh: 15,
      temperatureC: 28,
    };

    const alerts = detectSevereWeather(weather);
    assert.deepStrictEqual(alerts, []);
  });

  it("returns only official warnings", () => {
    const officialWarning = { type: "heavy_rain", isOfficialWarning: true };
    const alerts = detectSevereWeather({
      rainfallMm: 4,
      rainProbability: 100,
      officialWarnings: [officialWarning, { type: "high_wind", isOfficialWarning: false }],
    });

    assert.deepStrictEqual(alerts, [officialWarning]);
  });

  it("filters alerts based on role vulnerability", () => {
    const alerts = [
      { type: "high_wind", severity: "high" },
      { type: "heavy_rain", severity: "medium" },
    ];

    const fishermanAlerts = filterAlertsForUser(alerts, "fisherman");
    assert.strictEqual(fishermanAlerts.length, 2); // Fisherman is vulnerable to both wind & rain

    const farmerAlerts = filterAlertsForUser(alerts, "farmer");
    assert.strictEqual(farmerAlerts.length, 2);
  });

  it("builds personalized Tamil alert for a farmer", () => {
    const alert = {
      type: "heavy_rain",
      title: "🌧 Heavy Rain Alert / கனமழை எச்சரிக்கை",
      description: "Heavy rain expected.",
      tamilDescription: "கனமழை எதிர்பார்க்கப்படுகிறது.",
    };

    const result = buildPersonalizedAlert(alert, "farmer", "ta");
    assert.match(result.title, /கனமழை எச்சரிக்கை/);
    assert.match(result.body, /ஒத்திவைக்கவும்/);
  });
});

describe("Weather response severity", () => {
  it("defaults to normal when forecast values are missing or mild", () => {
    assert.strictEqual(calculateSeverity({}), "normal");
    assert.strictEqual(calculateSeverity({ rainfallMm: 1, temperatureC: 24, windSpeedKmh: 10 }), "normal");
  });

  it("marks existing advisory-level conditions as caution", () => {
    assert.strictEqual(calculateSeverity({ rainProbability: 60 }), "caution");
    assert.strictEqual(calculateSeverity({ windSpeedKmh: 25 }), "caution");
  });

  it("marks configured extreme thresholds as urgent", () => {
    assert.strictEqual(calculateSeverity({ tomorrow: { rainfallMm: 20, rainProbability: 80 } }), "urgent");
    assert.strictEqual(calculateSeverity({ windSpeedKmh: 38 }), "urgent");
    assert.strictEqual(calculateSeverity({ temperatureC: 38 }), "urgent");
  });
});
