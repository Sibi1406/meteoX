// utils/validation.js — Shared validation functions

function isValidCoordinates(lat, lng) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function isValidRole(role) {
  const allowed = ["farmer", "fisherman", "city_admin", "general", "researcher"];
  return allowed.includes(role);
}

module.exports = {
  isValidCoordinates,
  isValidRole,
};
