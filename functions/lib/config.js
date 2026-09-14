// config.js — Centralized application configuration

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
  ALERT_THRESHOLDS: {
    HEAVY_RAIN_MM: 20,       // >= 20mm/day is heavy rain
    HIGH_RAIN_PROB: 80,      // >= 80%
    HIGH_WIND_KMH: 38,       // >= 38 km/h is strong wind
    EXTREME_HEAT_C: 38,      // >= 38°C
    EXTREME_COLD_C: 8,       // <= 8°C
  },

  // Regional clusters supported (Spec §7)
  DEFAULT_CLUSTER_TYPE: "district",
};
