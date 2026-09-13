// alerts/detection.js — Extreme Weather Alert Detection (Spec §33)
/**
 * Returns only warnings supplied by an official warning provider such as IMD.
 * Forecast thresholds alone must not be presented as public alerts.
 */
function detectSevereWeather(weather) {
  return (weather?.officialWarnings || []).filter((warning) => warning?.isOfficialWarning === true);
}

module.exports = { detectSevereWeather };
