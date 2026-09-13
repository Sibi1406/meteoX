// utils/geo.js — Geolocation, Geohashing & Cluster representation
const geohash = require("ngeohash");

// Pre-mapped district centroids for Tamil Nadu & South India demo locations
const KNOWN_DISTRICTS = {
  ariyalur: { name: "Ariyalur", lat: 11.1401, lng: 79.0786, state: "Tamil Nadu", country: "India" },
  chengalpattu: { name: "Chengalpattu", lat: 12.6819, lng: 79.9888, state: "Tamil Nadu", country: "India" },
  cuddalore: { name: "Cuddalore", lat: 11.7480, lng: 79.7714, state: "Tamil Nadu", country: "India" },
  dharmapuri: { name: "Dharmapuri", lat: 12.1211, lng: 78.1582, state: "Tamil Nadu", country: "India" },
  dindigul: { name: "Dindigul", lat: 10.3673, lng: 77.9803, state: "Tamil Nadu", country: "India" },
  coimbatore: { name: "Coimbatore", lat: 11.0168, lng: 76.9558, state: "Tamil Nadu", country: "India" },
  chennai: { name: "Chennai", lat: 13.0827, lng: 80.2707, state: "Tamil Nadu", country: "India" },
  madurai: { name: "Madurai", lat: 9.9252, lng: 78.1198, state: "Tamil Nadu", country: "India" },
  thanjavur: { name: "Thanjavur", lat: 10.7870, lng: 79.1378, state: "Tamil Nadu", country: "India" },
  salem: { name: "Salem", lat: 11.6643, lng: 78.1460, state: "Tamil Nadu", country: "India" },
  tirunelveli: { name: "Tirunelveli", lat: 8.7139, lng: 77.7567, state: "Tamil Nadu", country: "India" },
  trichy: { name: "Tiruchirappalli", lat: 10.7905, lng: 78.7047, state: "Tamil Nadu", country: "India" },
  nilgiris: { name: "The Nilgiris", lat: 11.4102, lng: 76.6950, state: "Tamil Nadu", country: "India" },
  cuddalore: { name: "Cuddalore", lat: 11.7480, lng: 79.7714, state: "Tamil Nadu", country: "India" },
  kanyakumari: { name: "Kanyakumari", lat: 8.0883, lng: 77.5385, state: "Tamil Nadu", country: "India" },
  vellore: { name: "Vellore", lat: 12.9165, lng: 79.1325, state: "Tamil Nadu", country: "India" },
  erode: { name: "Erode", lat: 11.3410, lng: 77.7172, state: "Tamil Nadu", country: "India" },
  kallakurichi: { name: "Kallakurichi", lat: 11.7401, lng: 78.9597, state: "Tamil Nadu", country: "India" },
  kancheepuram: { name: "Kancheepuram", lat: 12.8342, lng: 79.7036, state: "Tamil Nadu", country: "India" },
  karur: { name: "Karur", lat: 10.9601, lng: 78.0766, state: "Tamil Nadu", country: "India" },
  krishnagiri: { name: "Krishnagiri", lat: 12.5186, lng: 78.2137, state: "Tamil Nadu", country: "India" },
  mayiladuthurai: { name: "Mayiladuthurai", lat: 11.1035, lng: 79.6550, state: "Tamil Nadu", country: "India" },
  nagapattinam: { name: "Nagapattinam", lat: 10.7672, lng: 79.8449, state: "Tamil Nadu", country: "India" },
  namakkal: { name: "Namakkal", lat: 11.2189, lng: 78.1674, state: "Tamil Nadu", country: "India" },
  perambalur: { name: "Perambalur", lat: 11.2320, lng: 78.8801, state: "Tamil Nadu", country: "India" },
  pudukkottai: { name: "Pudukkottai", lat: 10.3797, lng: 78.8208, state: "Tamil Nadu", country: "India" },
  ramanathapuram: { name: "Ramanathapuram", lat: 9.3639, lng: 78.8395, state: "Tamil Nadu", country: "India" },
  ranipet: { name: "Ranipet", lat: 12.9249, lng: 79.3333, state: "Tamil Nadu", country: "India" },
  sivaganga: { name: "Sivaganga", lat: 9.8433, lng: 78.4809, state: "Tamil Nadu", country: "India" },
  tenkasi: { name: "Tenkasi", lat: 8.9590, lng: 77.3152, state: "Tamil Nadu", country: "India" },
  theni: { name: "Theni", lat: 10.0104, lng: 77.4768, state: "Tamil Nadu", country: "India" },
  thoothukudi: { name: "Thoothukudi", lat: 8.7642, lng: 78.1348, state: "Tamil Nadu", country: "India" },
  tirupathur: { name: "Tirupathur", lat: 12.4996, lng: 78.5732, state: "Tamil Nadu", country: "India" },
  tiruppur: { name: "Tiruppur", lat: 11.1085, lng: 77.3411, state: "Tamil Nadu", country: "India" },
  tiruvallur: { name: "Tiruvallur", lat: 13.1439, lng: 79.9083, state: "Tamil Nadu", country: "India" },
  tiruvannamalai: { name: "Tiruvannamalai", lat: 12.2253, lng: 79.0747, state: "Tamil Nadu", country: "India" },
  tiruvarur: { name: "Tiruvarur", lat: 10.7725, lng: 79.6368, state: "Tamil Nadu", country: "India" },
  viluppuram: { name: "Viluppuram", lat: 11.9401, lng: 79.4861, state: "Tamil Nadu", country: "India" },
  virudhunagar: { name: "Virudhunagar", lat: 9.5680, lng: 77.9624, state: "Tamil Nadu", country: "India" },
};

/**
 * Encode lat/lng into a geohash string.
 * precision 6 ≈ village/street level (~600m x 600m cell)
 * precision 4 ≈ district/taluk level (~20km x 20km cell)
 */
function encode(lat, lng, precision = 6) {
  return geohash.encode(lat, lng, precision);
}

/** Shorten a geohash to a coarser precision for district-level clustering. */
function districtPrefix(hash6) {
  if (!hash6) return "tdr1";
  return hash6.slice(0, 4);
}

/**
 * Resolve cluster representation from coordinates or district name (Spec §7).
 */
function resolveCluster(lat, lng, districtName = null) {
  if (districtName) {
    const key = districtName.toLowerCase().replace(/\s+/g, "");
    if (KNOWN_DISTRICTS[key]) {
      return {
        clusterType: "district",
        clusterId: key,
        displayName: KNOWN_DISTRICTS[key].name,
      };
    }
  }

  // Find nearest known district or fallback to 4-char geohash
  if (lat != null && lng != null) {
    let closestKey = null;
    let minDistance = Infinity;

    for (const [key, info] of Object.entries(KNOWN_DISTRICTS)) {
      const d = Math.hypot(lat - info.lat, lng - info.lng);
      if (d < minDistance) {
        minDistance = d;
        closestKey = key;
      }
    }

    // If within ~50km (roughly 0.5 degrees), use district
    if (minDistance < 0.5 && closestKey) {
      return {
        clusterType: "district",
        clusterId: closestKey,
        displayName: KNOWN_DISTRICTS[closestKey].name,
      };
    }

    const hash4 = districtPrefix(encode(lat, lng, 6));
    return {
      clusterType: "geohash4",
      clusterId: hash4,
      displayName: `Cluster ${hash4}`,
    };
  }

  return {
    clusterType: "district",
    clusterId: "coimbatore",
    displayName: "Coimbatore",
  };
}

module.exports = {
  encode,
  districtPrefix,
  resolveCluster,
  KNOWN_DISTRICTS,
};
