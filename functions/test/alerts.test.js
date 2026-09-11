// test/alerts.test.js — Unit tests for extreme weather detection and role filtering
const { describe, it } = require("node:test");
const assert = require("node:assert");
const { detectSevereWeather } = require("../lib/alerts/detection");
const { filterAlertsForUser } = require("../lib/alerts/vulnerability");
const { buildPersonalizedAlert } = require("../lib/alerts/personalization");

describe("Extreme Weather Alert System", () => {
  it("detects heavy rainfall when rainProbability >= 80%", () => {
    const weather = {
      rainfallMm: 22,
      rainProbability: 85,
      windSpeedKmh: 15,
      temperatureC: 28,
    };

    const alerts = detectSevereWeather(weather);
    assert.ok(alerts.length > 0);
    assert.strictEqual(alerts[0].type, "heavy_rain");
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
