// pages/Home.jsx — MeteoX Intelligence & Regional Live Telemetry Hub
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchRealtimeWeather } from "../api";

const REGIONAL_STATIONS = [
  { id: "tirunelveli", nameEn: "Tirunelveli", nameTa: "திருநெல்வேலி", lat: 8.7139, lng: 77.7567, role: "Rice & Banana Fields" },
  { id: "coimbatore", nameEn: "Coimbatore", nameTa: "கோயம்புத்தூர்", lat: 11.0168, lng: 76.9558, role: "Industrial & Agro Hub" },
  { id: "chennai", nameEn: "Chennai", nameTa: "சென்னை", lat: 13.0827, lng: 80.2707, role: "Coastal Metropolis" },
  { id: "madurai", nameEn: "Madurai", nameTa: "மதுரை", lat: 9.9252, lng: 78.1198, role: "Heritage & Cotton Belt" },
  { id: "thanjavur", nameEn: "Thanjavur", nameTa: "தஞ்சாவூர்", lat: 10.7870, lng: 79.1378, role: "Delta Granary" },
];

export default function Home({ profile }) {
  const { language, t } = useLanguage();
  const isTamil = language === "ta";
  const [stationData, setStationData] = useState({});
  const [loadingStations, setLoadingStations] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadStations() {
      try {
        const results = {};
        for (const s of REGIONAL_STATIONS.slice(0, 4)) {
          const w = await fetchRealtimeWeather(s.lat, s.lng, isTamil).catch(() => null);
          if (w) results[s.id] = w;
        }
        if (isMounted) {
          setStationData(results);
          setLoadingStations(false);
        }
      } catch (e) {
        console.warn("Failed loading live stations:", e);
        if (isMounted) setLoadingStations(false);
      }
    }
    loadStations();
    return () => {
      isMounted = false;
    };
  }, [isTamil]);

  return (
    <div className="page home-page-dynamic">
      {/* Hero Section */}
      <div className="home-hero-wide">
        <div className="hero-badge">{t("heroBadge")}</div>
        <h2 className="hero-title">
          Meteo<span className="hero-gradient-text">X</span>
        </h2>
        <p className="hero-subtitle">{t("tagline")}</p>

        <div className="hero-actions-wide">
          <Link to="/dashboard" className="btn-primary hero-btn-wide">
            📊 {t("openDashboard")}
          </Link>
          <Link to="/chat" className="btn-secondary hero-btn-wide">
            💬 {t("askAdvisory")}
          </Link>
        </div>
      </div>

      {/* Live Tamil Nadu Regional Weather Telemetry (Replaces old static diagram) */}
      <div className="regional-telemetry-container">
        <div className="telemetry-header-row">
          <div>
            <h3 className="section-heading">{t("liveTelemetryTitle")}</h3>
            <p className="section-subtext">{t("liveTelemetrySub")}</p>
          </div>
          <span className="live-pill">
            <span className="live-dot-green"></span> LIVE OPEN-METEO
          </span>
        </div>

        <div className="station-cards-grid">
          {REGIONAL_STATIONS.map((st) => {
            const data = stationData[st.id];
            const name = isTamil ? st.nameTa : st.nameEn;
            return (
              <div key={st.id} className="station-card-glass">
                <div className="station-card-top">
                  <span className="station-name">📍 {name}</span>
                  <span className="station-condition-icon">{data?.weatherIcon || "🌤️"}</span>
                </div>
                <div className="station-temp-row">
                  <span className="station-temp">
                    {data ? `${data.temperatureC}°C` : "--"}
                  </span>
                  <span className="station-condition-text">
                    {data?.weatherCondition || (isTamil ? "ஏற்றப்படுகிறது..." : "Loading...")}
                  </span>
                </div>
                <div className="station-stats-row">
                  <span>🌧️ {data ? `${data.rainProbability}%` : "--"}</span>
                  <span>💨 {data ? `${data.windSpeedKmh} km/h` : "--"}</span>
                  <span>💦 {data ? `${data.humidityPercent}%` : "--"}</span>
                </div>
                <div className="station-footer-role">{st.role}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* User Status Bar */}
      {profile && (
        <div className="user-active-summary-wide">
          <div className="summary-col">
            <span className="summary-label">{t("activeRole")}</span>
            <span className="summary-val">{t(profile.role)}</span>
          </div>
          <div className="summary-col">
            <span className="summary-label">{t("districtCluster")}</span>
            <span className="summary-val">{profile.location?.district || "Tirunelveli"}</span>
          </div>
          <div className="summary-col">
            <span className="summary-label">{t("mode")}</span>
            <span className="summary-val status-green">
              <span className="live-dot-green"></span> {t("onlineGrounded")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
