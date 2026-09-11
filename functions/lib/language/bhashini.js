// language/bhashini.js — Bhashini Translation & Voice Synthesis Adapter (Spec §24)
const axios = require("axios");
const { info, warn } = require("../utils/logger");

/**
 * Standard Bhashini Adapter Interface.
 * Designed so real ULCA / Dhruva endpoints can be plugged in seamlessly
 * when BHASHINI_API_KEY is supplied.
 */
class BhashiniService {
  constructor(apiKey = null, inferenceUrl = null) {
    this.apiKey = apiKey || process.env.BHASHINI_API_KEY;
    this.inferenceUrl = inferenceUrl || "https://dhruva-api.bhashini.gov.in/services/inference/pipeline";
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  /**
   * Translates text from English to regional Indian language (e.g. Tamil 'ta').
   */
  async translate(text, targetLang = "ta", sourceLang = "en") {
    if (sourceLang === targetLang) {
      return { translatedText: text, source: "identity" };
    }

    if (!this.isConfigured()) {
      // Stub implementation: Returns original text with pass-through indicator
      info("Bhashini API not configured — using pass-through translation", { targetLang });
      return {
        translatedText: text,
        source: "stub",
        status: "NOT_CONFIGURED",
        note: "Bhashini credentials pending approval. English text passed through.",
      };
    }

    try {
      // Live Bhashini Dhruva pipeline execution
      const payload = {
        pipelineTasks: [
          {
            taskType: "translation",
            config: {
              language: {
                sourceLanguage: sourceLang,
                targetLanguage: targetLang,
              },
            },
          },
        ],
        inputData: {
          input: [{ source: text }],
        },
      };

      const response = await axios.post(this.inferenceUrl, payload, {
        headers: {
          Authorization: this.apiKey,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      const translated = response.data?.pipelineResponse?.[0]?.output?.[0]?.target;
      return {
        translatedText: translated || text,
        source: "bhashini",
        status: "SUCCESS",
      };
    } catch (err) {
      warn("Bhashini translation request failed — falling back to original", { error: err.message });
      return {
        translatedText: text,
        source: "fallback",
        error: err.message,
      };
    }
  }

  /**
   * Synthesizes text to speech (TTS) for accessibility in rural villages.
   */
  async textToSpeech(text, targetLang = "ta") {
    if (!this.isConfigured()) {
      return { audioBase64: null, status: "NOT_CONFIGURED" };
    }

    // Future Bhashini TTS task integration
    return { audioBase64: null, status: "PENDING_PIPELINE" };
  }
}

const bhashini = new BhashiniService();

module.exports = {
  BhashiniService,
  bhashini,
};
