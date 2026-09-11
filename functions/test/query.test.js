// test/query.test.js — Unit tests for query understanding in English and Tamil
const { describe, it } = require("node:test");
const assert = require("node:assert");
const { understandQuery } = require("../lib/query/queryUnderstanding");
const { INTENTS } = require("../lib/query/intent");

describe("Query Understanding", () => {
  it("extracts rainfall intent and tomorrow date from English query", () => {
    const result = understandQuery("Will it rain tomorrow?", { role: "general" });
    assert.strictEqual(result.intent, INTENTS.RAINFALL);
    assert.strictEqual(result.dateTime, "tomorrow");
    assert.strictEqual(result.language, "en");
  });

  it("extracts rainfall intent and tomorrow date from Tamil query", () => {
    const result = understandQuery("நாளைக்கு மழை பெய்யுமா?", { role: "farmer" });
    assert.strictEqual(result.intent, INTENTS.RAINFALL);
    assert.strictEqual(result.dateTime, "tomorrow");
    assert.strictEqual(result.language, "ta");
  });

  it("extracts agricultural advisory intent for Tamil fertilizer query", () => {
    const result = understandQuery("நாளைக்கு உரம் போடலாமா?", { role: "farmer" });
    assert.strictEqual(result.intent, INTENTS.AGRICULTURAL_ADVISORY);
    assert.strictEqual(result.dateTime, "tomorrow");
    assert.strictEqual(result.language, "ta");
  });

  it("extracts temperature intent for today", () => {
    const result = understandQuery("What is the temperature today?", { role: "general" });
    assert.strictEqual(result.intent, INTENTS.TEMPERATURE);
    assert.strictEqual(result.dateTime, "today");
    assert.strictEqual(result.isFactualOnly, true);
  });

  it("resolves mentioned location Coimbatore", () => {
    const result = understandQuery("How is the weather in Coimbatore?", { role: "general" });
    assert.ok(result.location);
    assert.strictEqual(result.location.name, "Coimbatore");
    assert.strictEqual(result.location.lat, 11.0168);
  });
});
