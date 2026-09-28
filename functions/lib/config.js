// config.js — Centralized application configuration
const { RAIN_DAY_MM } = require("./weatherThresholds.json");
const ALERT_THRESHOLDS = {
  HEAVY_RAIN_MM: 20,
  HIGH_RAIN_PROB: 80,
  HIGH_WIND_KMH: 38,
  EXTREME_HEAT_C: 38,
  EXTREME_COLD_C: 8,
};

const WINDOW_RULES = {
  SPRAY: {
    MAX_RAIN_PROB: 20,
    MIN_WIND_KMH: 3,
    MAX_WIND_KMH: 15,
    MAX_TEMP_C: 32,
    FOLLOWING_HOURS: 4,
    FOLLOWING_MAX_RAIN_PROB: 40,
    MIN_CONTIGUOUS_HOURS: 2,
  },
  SEA: {
    MAX_WIND_KMH: ALERT_THRESHOLDS.HIGH_WIND_KMH,
    MAX_GUST_KMH: 50,
    MAX_RAIN_PROB: 70,
    CAUTION_WIND_KMH: 25,
  },
  HEAT: { MIN_APPARENT_C: 41 },
  PEAK_RAIN: { HEAVY_RAIN_MM: 5, AVOID_MM: 15, TOP_HOURS_COUNT: 3 },
};

module.exports = {
  CACHE_TTL_MINUTES: 15,
  MAX_REGENERATIONS: 1,
  
  ROLES: {
    FARMER: "farmer",
    FISHERMAN: "fisherman",
    CITY_ADMIN: "city_admin",
    GENERAL: "general",
    RESEARCHER: "researcher",
  },

  LANGUAGES: {
    EN: "en",
    TA: "ta",
  },

  // Trust score observation thresholds (Spec §31)
  TRUST_THRESHOLDS: {
    INSUFFICIENT_MAX: 5,     // 0-5: Insufficient data
    LOW_CONFIDENCE_MAX: 20,  // 6-20: Low confidence
    USABLE_MIN: 21,          // 21+: Usable local calibration
  },

  // Extreme weather thresholds for alert detection (Spec §33)
  ALERT_THRESHOLDS,

  // Regional clusters supported (Spec §7)
  DEFAULT_CLUSTER_TYPE: "district",

  // Threshold note: Open-Meteo's precipitation_probability refers to a very low precipitation threshold,
  // so verifying against a much higher observed threshold would create systematic "false alarms".
  // RAIN_DAY_MM = 1.0 (a common wet-day convention) is the default. IMD's rainy-day convention of 2.5 mm is an alternative.
  RAIN_DAY_MM,             // one definition for verification AND user-facing text
  PREDICT_RAIN_PROB: 50,   // matches the existing forecast_records definition
  MODELS: ["ecmwf_ifs025", "gfs_seamless", "icon_seamless"],
  TRACK_WINDOW_DAYS: 30,
  DRIFT_MIN_DELTA: 20,     // percentage points

  // Thresholds for role action windows (Spec Section 4).
  // General starting points, not validated for Tamil Nadu crops or local fishing conditions.
  WINDOW_RULES,
};
