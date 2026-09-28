// test/actionWindows.test.js — Unit tests for role-specific action windows
const { describe, it } = require("node:test");
const assert = require("node:assert");
const { computeActionWindows } = require("../lib/advisory/actionWindows");

describe("Action Windows Engine", () => {
  const baseNow = new Date("2026-09-28T06:00:00+05:30");

  const buildHourly = (hoursCount, modifier = () => ({})) => {
    const list = [];
    for (let i = 0; i < hoursCount; i++) {
      const d = new Date(baseNow.getTime() + i * 3600 * 1000);
      const iso = d.toISOString();
      list.push({
        time: iso,
        rainProbability: 10,
        rainMm: 0,
        windKmh: 10,
        gustKmh: 15,
        temperatureC: 28,
        apparentC: 30,
        ...modifier(i, iso),
      });
    }
    return list;
  };

  it("farmer: identifies safe spray window when conditions permit", () => {
    const hourly = buildHourly(12, (i) => ({
      rainProbability: 5,
      windKmh: 8,
      temperatureC: 27,
    }));

    const windows = computeActionWindows({
      hourly,
      role: "farmer",
      now: baseNow,
    });

    assert.ok(windows.length > 0);
    const spray = windows.find((w) => w.type === "spray_window");
    assert.ok(spray);
    assert.strictEqual(spray.severity, "info");
    assert.ok(spray.startISO);
    assert.ok(spray.endISO);
    assert.ok(spray.basis.length >= 3);
  });

  it("farmer: produces no_spray_window with blocking metric when conditions are bad", () => {
    // Rain probability high throughout
    const hourly = buildHourly(12, () => ({
      rainProbability: 80, // blocked by rain
      windKmh: 10,
      temperatureC: 28,
    }));

    const windows = computeActionWindows({
      hourly,
      role: "farmer",
      now: baseNow,
    });

    const noSpray = windows.find((w) => w.type === "no_spray_window");
    assert.ok(noSpray);
    assert.strictEqual(noSpray.startISO, null);
    assert.strictEqual(noSpray.severity, "caution");
    assert.ok(noSpray.basis.some((b) => b.metric === "rainProbability" && b.value === 80));
  });

  it("farmer: blocked when wind speed exceeds maximum (> 15 km/h)", () => {
    const hourly = buildHourly(12, () => ({
      rainProbability: 5,
      windKmh: 25, // too high
      temperatureC: 28,
    }));

    const windows = computeActionWindows({
      hourly,
      role: "farmer",
      now: baseNow,
    });

    const noSpray = windows.find((w) => w.type === "no_spray_window");
    assert.ok(noSpray);
    assert.ok(noSpray.basis.some((b) => b.metric === "windSpeed" && b.value === 25));
  });

  it("does not infer a spray window when required hourly values are missing", () => {
    const hourly = buildHourly(12, () => ({ rainProbability: null }));
    const windows = computeActionWindows({ hourly, role: "farmer", now: baseNow });
    assert.ok(windows.some((window) => window.type === "no_spray_window"));
    assert.ok(!windows.some((window) => window.type === "spray_window"));
  });

  it("fisherman: identifies safe sea window ending before dangerous conditions", () => {
    const hourly = buildHourly(12, (i) => {
      if (i >= 5) {
        return { windKmh: 42 }; // unsafe starting at hour 5
      }
      return { windKmh: 15, gustKmh: 20, rainProbability: 20 };
    });

    const windows = computeActionWindows({
      hourly,
      role: "fisherman",
      now: baseNow,
    });

    const sea = windows.find((w) => w.type === "sea_window");
    assert.ok(sea);
    assert.strictEqual(sea.startISO, hourly[0].time);
    assert.strictEqual(sea.endISO, hourly[4].time); // Ends at hour 4 before unsafe hour 5
    assert.strictEqual(sea.severity, "info");
  });

  it("fisherman: reports sea_window_unsafe when starting conditions are hazardous", () => {
    const hourly = buildHourly(12, () => ({
      windKmh: 45, // dangerously high immediately
      gustKmh: 60,
    }));

    const windows = computeActionWindows({
      hourly,
      role: "fisherman",
      now: baseNow,
    });

    const sea = windows.find((w) => w.id === "sea_window_unsafe");
    assert.ok(sea);
    assert.strictEqual(sea.severity, "avoid");
  });

  it("does not label sea conditions safe when current inputs are missing", () => {
    const hourly = buildHourly(12, () => ({ gustKmh: null }));
    const windows = computeActionWindows({ hourly, role: "fisherman", now: baseNow });
    assert.deepStrictEqual(windows, []);
  });

  it("general / researcher: returns heat_avoid window when apparent temp >= 41°C", () => {
    const hourly = buildHourly(12, (i) => {
      if (i >= 4 && i <= 7) {
        return { apparentC: 43 }; // Dangerous heat
      }
      return { apparentC: 34 };
    });

    const windows = computeActionWindows({
      hourly,
      role: "general",
      now: baseNow,
    });

    const heat = windows.find((w) => w.type === "heat_avoid");
    assert.ok(heat);
    assert.strictEqual(heat.severity, "avoid");
    assert.strictEqual(heat.startISO, hourly[4].time);
    assert.strictEqual(heat.endISO, hourly[7].time);
    assert.ok(heat.basis.some((b) => b.metric === "apparentTemperature" && b.value === 43));
  });

  it("city_admin: identifies peak rain window when heavy rainfall occurs", () => {
    const hourly = buildHourly(12, (i) => {
      if (i >= 2 && i <= 4) {
        return { rainMm: 12 };
      }
      return { rainMm: 0 };
    });

    const windows = computeActionWindows({
      hourly,
      role: "city_admin",
      now: baseNow,
    });

    const peakRain = windows.find((w) => w.type === "peak_rain");
    assert.ok(peakRain);
    assert.strictEqual(peakRain.startISO, hourly[2].time);
    assert.strictEqual(peakRain.endISO, hourly[4].time);
    assert.ok(peakRain.basis.some((b) => b.metric === "rainfall" && b.value === 12));
  });

  it("returns empty array when hourly is empty or outside horizon", () => {
    assert.deepStrictEqual(computeActionWindows({ hourly: [], role: "farmer" }), []);
  });
});
