// advisory/roleRules.js — Role Rules Retrieval and Dispatcher (Spec §18)
const { db } = require("../../admin");
const { FARMER_RULES, getFarmerAdvisory, getFarmerAdvisoryDetailed } = require("./farmer");
const { FISHERMAN_RULES, getFishermanAdvisory, getFishermanAdvisoryDetailed } = require("./fisherman");
const { CITY_ADMIN_RULES, getCityAdminAdvisory, getCityAdminAdvisoryDetailed } = require("./cityAdmin");
const { GENERAL_RULES, getGeneralAdvisory, getGeneralAdvisoryDetailed } = require("./general");
const { info, error } = require("../utils/logger");

const DEFAULTS_BY_ROLE = {
  farmer: FARMER_RULES,
  fisherman: FISHERMAN_RULES,
  city_admin: CITY_ADMIN_RULES,
  general: GENERAL_RULES,
  researcher: GENERAL_RULES,
};

async function getRoleRules(role) {
  const normalizedRole = DEFAULTS_BY_ROLE[role] ? role : "general";
  try {
    const docRef = db.collection("role_rules").doc(normalizedRole);
    const snap = await docRef.get();

    if (snap.exists) {
      return snap.data();
    }

    // Auto-seed rule into Firestore
    const defaultRules = DEFAULTS_BY_ROLE[normalizedRole];
    await docRef.set({
      ...defaultRules,
      updatedAt: new Date(),
    });
    info("Seeded default role rules to Firestore", { role: normalizedRole });
    return defaultRules;
  } catch (err) {
    error("Failed to load role rules from Firestore", err, { role: normalizedRole });
    return DEFAULTS_BY_ROLE[normalizedRole];
  }
}

/**
 * Computes deterministic role-based rule advisory and structured rule metadata.
 */
function evaluateRoleAdvisoryDetailed(role, weather, lang = "en") {
  switch (role) {
    case "farmer":
      return getFarmerAdvisoryDetailed(weather, lang);
    case "fisherman":
      return getFishermanAdvisoryDetailed(weather, lang);
    case "city_admin":
      return getCityAdminAdvisoryDetailed(weather, lang);
    case "general":
    case "researcher":
    default:
      return getGeneralAdvisoryDetailed(weather, lang);
  }
}

/**
 * Computes deterministic role-based rule advisory string from weather facts.
 */
function evaluateRoleAdvisory(role, weather, lang = "en") {
  return evaluateRoleAdvisoryDetailed(role, weather, lang).text;
}

module.exports = {
  getRoleRules,
  evaluateRoleAdvisory,
  evaluateRoleAdvisoryDetailed,
  DEFAULTS_BY_ROLE,
};
