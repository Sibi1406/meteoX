// test/modelAgreement.test.js — Unit tests for multi-model agreement
const { describe, it } = require("node:test");
const assert = require("node:assert");
const { computeModelAgreement, computeAgreementForDay } = require("../lib/weather/modelAgreement");
const { RAIN_DAY_MM } = require("../lib/config");

describe("Multi-Model Agreement Engine", () => {
  it("detects agree_rain when all 3 models vote rain", () => {
    const raw = {
      daily: {
        time: ["2026-09-28", "2026-09-29"],
        precipitation_sum_ecmwf_ifs025: [0, 4.5],
        precipitation_probability_max_ecmwf_ifs025: [0, 85],
        precipitation_sum_gfs_seamless: [0, 2.0],
        precipitation_probability_max_gfs_seamless: [0, 70],
        precipitation_sum_icon_seamless: [0, 3.2],
        precipitation_probability_max_icon_seamless: [0, 80],
      },
    };

    const result = computeModelAgreement(raw);
    assert.ok(result);
    assert.strictEqual(result.level, "agree_rain");
    assert.strictEqual(result.rainVotes, 3);
    assert.strictEqual(result.of, 3);
    assert.strictEqual(result.spreadMm, 2.5); // 4.5 - 2.0
  });

  it("detects agree_dry when all 3 models vote dry (< RAIN_DAY_MM)", () => {
    const raw = {
      daily: {
        time: ["2026-09-28", "2026-09-29"],
        precipitation_sum_ecmwf_ifs025: [0, 0.2],
        precipitation_probability_max_ecmwf_ifs025: [0, 10],
        precipitation_sum_gfs_seamless: [0, 0.0],
        precipitation_probability_max_gfs_seamless: [0, 5],
        precipitation_sum_icon_seamless: [0, 0.5],
        precipitation_probability_max_icon_seamless: [0, 15],
      },
    };

    const result = computeModelAgreement(raw);
    assert.ok(result);
    assert.strictEqual(result.level, "agree_dry");
    assert.strictEqual(result.rainVotes, 0);
    assert.strictEqual(result.of, 3);
    assert.strictEqual(result.spreadMm, 0.5);
  });

  it("detects split when models disagree", () => {
    const raw = {
      daily: {
        time: ["2026-09-28", "2026-09-29"],
        precipitation_sum_ecmwf_ifs025: [0, 3.5], // votes rain (>= 1.0)
        precipitation_probability_max_ecmwf_ifs025: [0, 75],
        precipitation_sum_gfs_seamless: [0, 0.1], // votes dry
        precipitation_probability_max_gfs_seamless: [0, 12],
        precipitation_sum_icon_seamless: [0, 1.8], // votes rain
        precipitation_probability_max_icon_seamless: [0, 60],
      },
    };

    const result = computeModelAgreement(raw);
    assert.ok(result);
    assert.strictEqual(result.level, "split");
    assert.strictEqual(result.rainVotes, 2);
    assert.strictEqual(result.of, 3);
  });

  it("handles null probability for one model without crashing", () => {
    const raw = {
      daily: {
        time: ["2026-09-28", "2026-09-29"],
        precipitation_sum_ecmwf_ifs025: [0, 2.5],
        precipitation_probability_max_ecmwf_ifs025: [0, 80],
        precipitation_sum_gfs_seamless: [0, 1.5],
        precipitation_probability_max_gfs_seamless: [0, null], // null probability!
        precipitation_sum_icon_seamless: [0, 3.0],
        precipitation_probability_max_icon_seamless: [0, 65],
      },
    };

    const result = computeModelAgreement(raw);
    assert.ok(result);
    assert.strictEqual(result.level, "agree_rain");
    assert.strictEqual(result.rainVotes, 3);

    const gfs = result.models.find((m) => m.id === "gfs_seamless");
    assert.ok(gfs);
    assert.strictEqual(gfs.rainProbability, null);
    assert.strictEqual(gfs.votesRain, true);
    assert.strictEqual(gfs.rainMm, 1.5);
  });

  it("does not turn a missing model rainfall value into a dry vote", () => {
    const result = computeAgreementForDay({
      time: ["2026-09-29"],
      precipitation_sum_ecmwf_ifs025: [null],
      precipitation_sum_gfs_seamless: [2],
      precipitation_probability_max_gfs_seamless: [70],
      precipitation_sum_icon_seamless: [0],
      precipitation_probability_max_icon_seamless: [10],
    }, 0);

    assert.strictEqual(result.rainVotes, 1);
    assert.strictEqual(result.of, 2);
    assert.strictEqual(result.models.find((model) => model.id === "ecmwf_ifs025").votesRain, null);
  });
});
