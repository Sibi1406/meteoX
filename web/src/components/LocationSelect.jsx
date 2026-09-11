// components/LocationSelect.jsx — Location detection and district selector (Spec §7)
import { useState, useEffect } from "react";
import { useLanguage } from "../i18n/LanguageContext";

export const DISTRICT_COORDINATES = {
  tirunelveli: { name: "Tirunelveli", lat: 8.7139, lng: 77.7567 },
  coimbatore: { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
  chennai: { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  madurai: { name: "Madurai", lat: 9.9252, lng: 78.1198 },
  thanjavur: { name: "Thanjavur", lat: 10.7870, lng: 79.1378 },
  salem: { name: "Salem", lat: 11.6643, lng: 78.1460 },
  trichy: { name: "Tiruchirappalli", lat: 10.7905, lng: 78.7047 },
  nilgiris: { name: "The Nilgiris", lat: 11.4102, lng: 76.6950 },
  cuddalore: { name: "Cuddalore", lat: 11.7480, lng: 79.7714 },
  kanyakumari: { name: "Kanyakumari", lat: 8.0883, lng: 77.5385 },
  vellore: { name: "Vellore", lat: 12.9165, lng: 79.1325 },
  erode: { name: "Erode", lat: 11.3410, lng: 77.7172 },
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
    <div className="location-select-box">
      <button className="btn-secondary gps-btn" onClick={detectGps} disabled={busy}>
        📍 {busy ? t("detectingGps") : t("useGps")}
      </button>

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
