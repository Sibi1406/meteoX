// pages/Dashboard.jsx — Production-Grade Multi-Column Weather & Advisory Dashboard for MeteoX
import { useState, useEffect } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { api, fetchRealtimeWeather } from "../api";
import AdvisoryCard from "../components/AdvisoryCard";
import TrustScore from "../components/TrustScore";
import AlertCard from "../components/AlertCard";
import Feedback from "../components/Feedback";
import Loading from "../components/Loading";
import RoleIcon from "../components/RoleIcon";

const REGIONAL_STATIONS = [
  { id: "tirunelveli", nameEn: "Tirunelveli", nameTa: "திருநெல்வேலி", lat: 8.7139, lng: 77.7567, role: "Rice & Banana Fields" },
  { id: "coimbatore", nameEn: "Coimbatore", nameTa: "கோயம்புத்தூர்", lat: 11.0168, lng: 76.9558, role: "Industrial & Agro Hub" },
  { id: "chennai", nameEn: "Chennai", nameTa: "சென்னை", lat: 13.0827, lng: 80.2707, role: "Coastal Metropolis" },
  { id: "madurai", nameEn: "Madurai", nameTa: "மதுரை", lat: 9.9252, lng: 78.1198, role: "Heritage & Cotton Belt" },
  { id: "thanjavur", nameEn: "Thanjavur", nameTa: "தஞ்சாவூர்", lat: 10.7870, lng: 79.1378, role: "Delta Granary" },
];

export default function Dashboard({ profile }) {
  const { language, t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulatedAlert, setSimulatedAlert] = useState(null);
  const [stationData, setStationData] = useState({});

  const lat = profile?.location?.latitude || 8.7139;
  const lng = profile?.location?.longitude || 77.7567;
  const role = profile?.role || "farmer";
  const district = profile?.location?.district || "Tirunelveli";
  const clusterData = profile?.location?.cluster;
  const isTamil = language === "ta";

  useEffect(() => {
    let isMounted = true;
    async function loadDashboard() {
      setLoading(true);
      try {
        const result = await api.getWeatherDashboard({
          lat,
          lng,
          role,
          languageCode: language,
          district,
          cluster: clusterData,
        });
        if (isMounted) setData(result);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, [lat, lng, role, language, district, clusterData]);

  // Load Regional Stations weather for Dashboard multi-city grid (Spec Item 1)
  useEffect(() => {
    let isMounted = true;
    async function loadStations() {
      try {
        const results = {};
        for (const s of REGIONAL_STATIONS) {
          const w = await fetchRealtimeWeather(s.lat, s.lng, isTamil).catch(() => null);
          if (w) results[s.id] = w;
        }
        if (isMounted) setStationData(results);
      } catch (e) {
        console.warn("Failed loading regional stations:", e);
      }
    }
    loadStations();
    return () => {
      isMounted = false;
    };
  }, [isTamil]);

  // Hackathon Demo Mode: Trigger simulated severe weather alert
  async function handleTriggerDemoAlert() {
    try {
      const demoRes = await api.triggerDemoAlert({
        alertType: "heavy_rain",
        role,
        language,
      });
      setSimulatedAlert(demoRes.alert);
    } catch (err) {
      console.error("Demo alert error:", err);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading-view">
        <Loading message={t("loadingDashboard")} />
      </div>
    );
  }

  const weather = data?.weather;
  const tomorrow = weather?.tomorrow;
  const cluster = data?.cluster || clusterData || { displayName: district };
  const alerts = [...(data?.alerts || []), ...(simulatedAlert ? [simulatedAlert] : [])];

  return (
    <div className="page dashboard-page-wide">
      {/* Top Bar Indicator with jargon removed */}
      <div className="dashboard-header-bar">
        <div className="location-cluster-title">
          <span className="live-radar-tag">
            <span className="live-dot-green"></span> {t("liveWeatherData")}
          </span>
          <h2>{cluster.displayName || district}</h2>
          <span className="coords-sub">
            {lat.toFixed(2)}°N, {lng.toFixed(2)}°E • {weather?.timestamp || t("updatedAgo")}
          </span>
        </div>
        <div className="header-badges">
          <span className="role-pill-badge" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <RoleIcon role={role} size={16} />
            <span>{t(role)}</span>
          </span>
          <span className="source-pill-badge">📡 {t("liveWeatherData")}</span>
        </div>
      </div>

      {/* Active Severe Weather Alerts */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          {alerts.map((alert, idx) => (
            <AlertCard key={idx} alert={alert} />
          ))}
        </div>
      )}

      {/* Main Responsive Grid Layout (Desktop 2-Column / Mobile Stack) */}
      <div className="dashboard-main-grid">
        {/* Left / Primary Column */}
        <div className="dashboard-primary-col">
          {/* Hero Weather Card */}
          <div className="hero-weather-card-glass">
            <div className="hero-weather-top">
              <div className="hero-temp-group">
                <span className="hero-weather-icon">{weather?.weatherIcon || "☀️"}</span>
                <div>
                  <div className="hero-temp-large">
                    {weather?.temperatureC != null ? `${weather.temperatureC}°` : "30°"}
                    <span className="temp-unit">C</span>
                  </div>
                  <div className="hero-condition-text">
                    {weather?.weatherCondition || "Clear Sky"}
                  </div>
                </div>
              </div>
              <div className="hero-feels-box">
                <div className="feels-label">{t("feelsLike")}</div>
                <div className="feels-value">{weather?.apparentTemperatureC ?? 31}°C</div>
                <div className="minmax-row">
                  <span>H: {weather?.today?.tempMaxC ?? 32}°</span>
                  <span>L: {weather?.today?.tempMinC ?? 24}°</span>
                </div>
              </div>
            </div>

            {/* Weather Metric Chips Row */}
            <div className="hero-metrics-strip">
              <div className="metric-chip">
                <span className="m-icon">🌧️</span>
                <div>
                  <span className="m-label">{t("rainProbability")}</span>
                  <span className="m-val">{weather?.rainProbability ?? 15}%</span>
                </div>
              </div>
              <div className="metric-chip">
                <span className="m-icon">💧</span>
                <div>
                  <span className="m-label">{t("rainfall")}</span>
                  <span className="m-val">{weather?.rainfallMm ?? 0} mm</span>
                </div>
              </div>
              <div className="metric-chip">
                <span className="m-icon">💨</span>
                <div>
                  <span className="m-label">{t("windSpeed")}</span>
                  <span className="m-val">{weather?.windSpeedKmh ?? 12} km/h</span>
                </div>
              </div>
              <div className="metric-chip">
                <span className="m-icon">💦</span>
                <div>
                  <span className="m-label">{t("humidity")}</span>
                  <span className="m-val">{weather?.humidityPercent ?? 65}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-Time Hourly Forecast Row */}
          {weather?.hourly && weather.hourly.length > 0 && (
            <div className="dashboard-section-card">
              <div className="section-card-header">
                <h4>⏰ {t("hourlyForecast")}</h4>
                <span className="section-meta">Next 12 Hours</span>
              </div>
              <div className="hourly-forecast-row">
                {weather.hourly.map((h, idx) => (
                  <div key={idx} className="hourly-chip">
                    <span className="hourly-time">{h.time}</span>
                    <span className="hourly-icon">{h.icon}</span>
                    <span className="hourly-temp">{h.temp}°</span>
                    <span className="hourly-rain">💧{h.rainProbability}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROMINENT Role Advisory Card */}
          <div className="prominent-advisory-section">
            <AdvisoryCard
              role={role}
              advisory={data?.roleAdvisory}
              title={role === "farmer" ? t("agriculturalAdvisory") : null}
            />
          </div>

          {/* 7-Day Weekly Outlook */}
          {weather?.dailyForecast && weather.dailyForecast.length > 0 && (
            <div className="dashboard-section-card">
              <div className="section-card-header">
                <h4>📅 {t("weeklyOutlook")}</h4>
                <span className="section-meta">Multi-Day Ensemble</span>
              </div>
              <div className="daily-forecast-list">
                {weather.dailyForecast.map((d, idx) => (
                  <div key={idx} className="daily-forecast-row">
                    <span className="daily-name">{d.dayName}</span>
                    <span className="daily-icon">{d.icon}</span>
                    <span className="daily-condition">{d.condition}</span>
                    <span className="daily-rain">💧 {d.rainProbability}%</span>
                    <div className="daily-temp-bar">
                      <span className="t-min">{d.tempMin}°</span>
                      <div className="t-bar">
                        <div
                          className="t-fill"
                          style={{
                            width: `${Math.min(100, Math.max(20, (d.tempMax - d.tempMin) * 8))}%`,
                          }}
                        ></div>
                      </div>
                      <span className="t-max">{d.tempMax}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right / Telemetry & Feedback Column */}
        <div className="dashboard-sidebar-col">
          {/* Real-time Atmospheric Telemetry */}
          <div className="telemetry-panel-card">
            <h4>🛰️ Live Atmospheric Telemetry</h4>
            <div className="telemetry-compact-grid">
              <div className="tele-item">
                <span className="tele-label">Barometric Pressure</span>
                <span className="tele-val">{weather?.pressureHpa ?? 1012} hPa</span>
                <span className="tele-sub">Mean Sea Level</span>
              </div>
              <div className="tele-item">
                <span className="tele-label">UV Index</span>
                <span className="tele-val">{weather?.uvIndex ?? 6} / 11</span>
                <span className="tele-sub">Moderate Exposure</span>
              </div>
              <div className="tele-item">
                <span className="tele-label">Cloud Cover</span>
                <span className="tele-val">{weather?.cloudCoverPercent ?? 25}%</span>
                <span className="tele-sub">Sky Obscuration</span>
              </div>
              <div className="tele-item">
                <span className="tele-label">Wind Direction</span>
                <span className="tele-val">{weather?.windDirectionDeg ?? 140}°</span>
                <span className="tele-sub">Compass Heading</span>
              </div>
            </div>
          </div>

          {/* Local Forecast Reliability Score */}
          <div className="trust-score-section">
            <TrustScore trustData={data?.trustScore} clusterName={cluster.displayName || district} />
          </div>

          {/* One-Tap Ground Truth Feedback */}
          <div className="dashboard-feedback-section">
            <Feedback
              forecastId={`dashboard_${cluster.clusterId || district.toLowerCase()}_${tomorrow?.date || "today"}`}
              lat={lat}
              lng={lng}
              role={role}
              district={district}
              onCalibrated={(newScore) => {
                setData((prev) => ({
                  ...prev,
                  trustScore: { ...prev.trustScore, ...newScore },
                }));
              }}
            />
          </div>

          {/* Hackathon Demo Alert Panel */}
          <div className="demo-mode-panel">
            <div className="demo-header">
              <span className="demo-icon">🧪</span>
              <span className="demo-title">{t("demoMode")}</span>
            </div>
            <p className="demo-desc">{t("demoModeDesc")}</p>
            <button className="btn-secondary demo-trigger-btn" onClick={handleTriggerDemoAlert}>
              ⚡ {t("simulatedDemoAlert")}
            </button>
          </div>
        </div>
      </div>

      {/* Regional Weather Radar (Multi-city grid consolidated here per Spec Item 1) */}
      <div className="regional-telemetry-container" style={{ marginTop: "16px" }}>
        <div className="telemetry-header-row">
          <div>
            <h3 className="section-heading">{t("liveTelemetryTitle")}</h3>
            <p className="section-subtext">{t("liveTelemetrySub")}</p>
          </div>
          <span className="live-pill">
            <span className="live-dot-green"></span> {t("liveWeatherData")}
          </span>
        </div>

        <div className="station-cards-grid">
          {REGIONAL_STATIONS.map((st) => {
            const sData = stationData[st.id];
            const name = isTamil ? st.nameTa : st.nameEn;
            return (
              <div key={st.id} className="station-card-glass">
                <div className="station-card-top">
                  <span className="station-name">📍 {name}</span>
                  <span className="station-condition-icon">{sData?.weatherIcon || "🌤️"}</span>
                </div>
                <div className="station-temp-row">
                  <span className="station-temp">
                    {sData ? `${sData.temperatureC}°C` : "--"}
                  </span>
                  <span className="station-condition-text">
                    {sData?.weatherCondition || (isTamil ? "ஏற்றப்படுகிறது..." : "Loading...")}
                  </span>
                </div>
                <div className="station-stats-row">
                  <span>🌧️ {sData ? `${sData.rainProbability}%` : "--"}</span>
                  <span>💨 {sData ? `${sData.windSpeedKmh} km/h` : "--"}</span>
                  <span>💦 {sData ? `${sData.humidityPercent}%` : "--"}</span>
                </div>
                <div className="station-footer-role">{st.role}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
