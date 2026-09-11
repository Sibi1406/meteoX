// test/weather.test.js — Unit tests for weather validation and normalization
const { describe, it } = require("node:test");
const assert = require("node:assert");
const { validateWeather } = require("../lib/weather/validator");
const { normalizeOpenMeteo } = require("../lib/weather/aggregator");

describe("Weather Validation & Normalization", () => {
  it("passes valid weather readings", () => {
    const validData = {
      temperatureC: 28,
      rainfallMm: 12.5,
      rainProbability: 80,
      humidityPercent: 65,
      windSpeedKmh: 14,
    };
    const result = validateWeather(validData);
    assert.strictEqual(result.valid, true);
  });

  it("rejects impossible negative rainfall", () => {
    const invalidData = {
      rainfallMm: -5,
      rainProbability: 50,
    };
    const result = validateWeather(invalidData);
    assert.strictEqual(result.valid, false);
    assert.match(result.reason, /rainfall/i);
  });

  it("rejects humidity > 100%", () => {
    const invalidData = {
      humidityPercent: 120,
    };
    const result = validateWeather(invalidData);
    assert.strictEqual(result.valid, false);
    assert.match(result.reason, /humidity/i);
  });

  it("rejects rain probability > 100%", () => {
    const invalidData = {
      rainProbability: 110,
    };
    const result = validateWeather(invalidData);
    assert.strictEqual(result.valid, false);
    assert.match(result.reason, /rainProbability/i);
  });

  it("normalizes Open-Meteo response into required schema", () => {
    const rawMock = {
      current: {
        time: "2026-09-11T12:00",
        temperature_2m: 29.5,
        relative_humidity_2m: 72,
        precipitation: 2.5,
        weather_code: 61,
        wind_speed_10m: 16.2,
      },
      daily: {
        time: ["2026-09-11", "2026-09-12"],
        temperature_2m_max: [31.0, 30.5],
        temperature_2m_min: [24.0, 23.8],
        precipitation_sum: [2.5, 12.0],
        precipitation_probability_max: [60, 85],
        wind_speed_10m_max: [18.0, 22.0],
        weather_code: [61, 65],
      },
    };

    const normalized = normalizeOpenMeteo(rawMock, 11.0168, 76.9558, "en");

    assert.strictEqual(normalized.temperatureC, 29.5);
    assert.strictEqual(normalized.sources[0], "open-meteo");
    assert.strictEqual(normalized.tomorrow.rainProbability, 85);
    assert.strictEqual(normalized.tomorrow.rainfallMm, 12.0);
    assert.strictEqual(normalized.location.cluster.clusterId, "coimbatore");
  });
});
