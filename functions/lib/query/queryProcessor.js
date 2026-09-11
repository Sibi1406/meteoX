// query/queryProcessor.js — Main query processing orchestrator
const { understandQuery } = require("./queryUnderstanding");

/**
 * Parses the incoming user query and merges with user profile context.
 */
function processQuery(rawQuery, userProfile = {}, fallbackCoords = null) {
  const parsed = understandQuery(rawQuery, userProfile);

  // If query explicitly specified a known district location, use that; otherwise use profile coords
  let targetLat = fallbackCoords ? fallbackCoords.lat : null;
  let targetLng = fallbackCoords ? fallbackCoords.lng : null;

  if (parsed.location) {
    targetLat = parsed.location.lat;
    targetLng = parsed.location.lng;
  }

  return {
    ...parsed,
    targetCoords: {
      lat: targetLat,
      lng: targetLng,
    },
  };
}

module.exports = { processQuery };
