// components/LocationSelect.jsx — Location detection and district selector (Spec §7)
import { useState, useEffect } from "react";
import { useLanguage } from "../i18n/LanguageContext";

export const DISTRICT_COORDINATES = {
  ariyalur: { name: "Ariyalur", lat: 11.1401, lng: 79.0786 },
  chengalpattu: { name: "Chengalpattu", lat: 12.6819, lng: 79.9888 },
  chennai: { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  coimbatore: { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
  cuddalore: { name: "Cuddalore", lat: 11.7480, lng: 79.7714 },
  dharmapuri: { name: "Dharmapuri", lat: 12.1211, lng: 78.1582 },
  dindigul: { name: "Dindigul", lat: 10.3673, lng: 77.9803 },
  erode: { name: "Erode", lat: 11.3410, lng: 77.7172 },
  kallakurichi: { name: "Kallakurichi", lat: 11.7401, lng: 78.9597 },
  kancheepuram: { name: "Kancheepuram", lat: 12.8342, lng: 79.7036 },
  kanyakumari: { name: "Kanyakumari", lat: 8.0883, lng: 77.5385 },
  karur: { name: "Karur", lat: 10.9601, lng: 78.0766 },
  krishnagiri: { name: "Krishnagiri", lat: 12.5186, lng: 78.2137 },
  madurai: { name: "Madurai", lat: 9.9252, lng: 78.1198 },
  mayiladuthurai: { name: "Mayiladuthurai", lat: 11.1035, lng: 79.6550 },
  nagapattinam: { name: "Nagapattinam", lat: 10.7672, lng: 79.8449 },
  namakkal: { name: "Namakkal", lat: 11.2189, lng: 78.1674 },
  nilgiris: { name: "The Nilgiris", lat: 11.4102, lng: 76.6950 },
  perambalur: { name: "Perambalur", lat: 11.2320, lng: 78.8801 },
  pudukkottai: { name: "Pudukkottai", lat: 10.3797, lng: 78.8208 },
  ramanathapuram: { name: "Ramanathapuram", lat: 9.3639, lng: 78.8395 },
  ranipet: { name: "Ranipet", lat: 12.9249, lng: 79.3333 },
  salem: { name: "Salem", lat: 11.6643, lng: 78.1460 },
  sivaganga: { name: "Sivaganga", lat: 9.8433, lng: 78.4809 },
  tenkasi: { name: "Tenkasi", lat: 8.9590, lng: 77.3152 },
  thanjavur: { name: "Thanjavur", lat: 10.7870, lng: 79.1378 },
  theni: { name: "Theni", lat: 10.0104, lng: 77.4768 },
  thoothukudi: { name: "Thoothukudi", lat: 8.7642, lng: 78.1348 },
  tiruchirappalli: { name: "Tiruchirappalli", lat: 10.7905, lng: 78.7047 },
  tirunelveli: { name: "Tirunelveli", lat: 8.7139, lng: 77.7567 },
  tirupathur: { name: "Tirupathur", lat: 12.4996, lng: 78.5732 },
  tiruppur: { name: "Tiruppur", lat: 11.1085, lng: 77.3411 },
  tiruvallur: { name: "Tiruvallur", lat: 13.1439, lng: 79.9083 },
  tiruvannamalai: { name: "Tiruvannamalai", lat: 12.2253, lng: 79.0747 },
  tiruvarur: { name: "Tiruvarur", lat: 10.7725, lng: 79.6368 },
  vellore: { name: "Vellore", lat: 12.9165, lng: 79.1325 },
  viluppuram: { name: "Viluppuram", lat: 11.9401, lng: 79.4861 },
  virudhunagar: { name: "Virudhunagar", lat: 9.5680, lng: 77.9624 },
};

export default function LocationSelect({ currentLocation, onSelect }) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  
  const currentKey = currentLocation?.district?.toLowerCase();
  const validKey = DISTRICT_COORDINATES[currentKey] ? currentKey : "tirunelveli";

  const [selectedDistrict, setSelectedDistrict] = useState(validKey);

  useEffect(() => {
    if (currentLocation?.district) {
      const key = currentLocation.district.toLowerCase();
      if (DISTRICT_COORDINATES[key]) {
        setSelectedDistrict(key);
      }
    }
  }, [currentLocation]);

  function detectGps() {
    setError("");
    setBusy(true);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setBusy(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lng = Number(pos.coords.longitude.toFixed(4));
        onSelect({
          latitude: lat,
          longitude: lng,
          district: "GPS Location",
          cluster: { clusterType: "gps", clusterId: "local_gps", displayName: `GPS (${lat}, ${lng})` },
        });
      },
      (err) => {
        setBusy(false);
        setError("GPS permission denied or timed out. Please select a district below.");
      },
      { timeout: 8000 }
    );
  }

  function handleDistrictChange(e) {
    const key = e.target.value;
    setSelectedDistrict(key);
    const info = DISTRICT_COORDINATES[key];
    if (info) {
      onSelect({
        latitude: info.lat,
        longitude: info.lng,
        district: info.name,
        cluster: { clusterType: "district", clusterId: key, displayName: info.name },
      });
    }
  }

  return (
    <div className="location-select-box glass-card card-system">
      <button className="btn-secondary gps-btn" onClick={detectGps} disabled={busy}>
        📍 {busy ? t("detectingGps") : t("useGps")}
      </button>

      <div className="gps-trust-line">
        <span>🔒</span>
        <span>{t("gpsTrustLine")}</span>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="field district-field">
        <label>{t("orSelectDistrict")}</label>
        <select value={selectedDistrict} onChange={handleDistrictChange}>
          {Object.entries(DISTRICT_COORDINATES).map(([key, item]) => (
            <option key={key} value={key}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
