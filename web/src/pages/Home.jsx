// pages/Home.jsx - MeteoX weather intelligence home
import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { api, interpretWeatherCode } from "../api";
import AdvisoryCard from "../components/AdvisoryCard";
import AlertCard from "../components/AlertCard";
import Feedback from "../components/Feedback";
import Loading from "../components/Loading";
import RoleIcon from "../components/RoleIcon";
import TrustScore from "../components/TrustScore";

export default function Home({ profile }) {
  const { language, t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulatedAlert, setSimulatedAlert] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const lat = profile?.location?.latitude || 8.7139;
  const lng = profile?.location?.longitude || 77.7567;
  const role = profile?.role || "farmer";
  const district = profile?.location?.district || "Tirunelveli";
  const clusterData = profile?.location?.cluster;
  const isTamil = language === "ta";

  useEffect(() => {
    let isMounted = true;
    async function loadWeather() {
      setLoading(true);
      try {
        const result = await api.getWeatherDashboard({ lat, lng, role, languageCode: language, district, cluster: clusterData });
        if (isMounted) setData(result);
      } catch (err) {
        console.error("Failed to load home weather intelligence:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadWeather();
    const refreshTimer = window.setInterval(loadWeather, 60 * 1000);
    const refreshOnFocus = () => loadWeather();
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [lat, lng, role, language, district, clusterData]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  async function handleTriggerDemoAlert() {
    try {
      const demoRes = await api.triggerDemoAlert({ alertType: "heavy_rain", role, language });
      setSimulatedAlert(demoRes.alert);
    } catch (err) {
      console.error("Demo alert error:", err);
    }
  }

  if (loading) {
    return <div className="dashboard-loading-view"><Loading message={t("loadingDashboard")} /></div>;
  }

  const weather = data?.weather;
  const tomorrow = weather?.tomorrow;
  const cluster = data?.cluster || clusterData || { displayName: district };
  const alerts = [...(data?.alerts || []), ...(simulatedAlert ? [simulatedAlert] : [])];
  const currentDate = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, "0")}-${String(currentTime.getDate()).padStart(2, "0")}`;
  const hourlyToday = (weather?.hourly || []).filter((hour) => {
    const match = typeof hour.time === "string" && hour.time.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})/);
    if (!match) return false;
    const hourDate = match[1];
    return hourDate === currentDate;
  });
  const dailyForecast = weather?.daily || weather?.dailyForecast || [];
  const currentCondition = interpretWeatherCode(weather?.weatherCode ?? 0, isTamil);

  function hourLabel(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString([], { hour: "numeric" });
  }

  function updatedLabel(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? t("updatedAgo")
      : `${t("updatedAt")} ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }

  return (
    <div className="page dashboard-page-wide home-intelligence-page">
      <div className="dashboard-header-bar">
        <div className="location-cluster-title">
          <span className="live-radar-tag"><span className="live-dot-green"></span> {t("liveWeatherData")}</span>
          <h2>{cluster.displayName || district}</h2>
          <span className="coords-sub">{lat.toFixed(2)}°N, {lng.toFixed(2)}°E • {updatedLabel(weather?.timestamp)}</span>
        </div>
        <div className="header-badges">
          <span className="role-pill-badge" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><RoleIcon role={role} size={16} /><span>{t(role)}</span></span>
          <span className="source-pill-badge">📡 {t("liveWeatherData")}</span>
        </div>
      </div>

      {alerts.length > 0 && <div className="alerts-section">{alerts.map((alert, index) => <AlertCard key={index} alert={alert} />)}</div>}

      <div className="dashboard-main-grid">
        <div className="dashboard-primary-col">
          <div className="hero-weather-card-glass">
            <div className="hero-weather-top">
              <div className="hero-temp-group">
                <span className="hero-weather-icon">{currentCondition.icon}</span>
                <div><div className="hero-temp-large">{weather?.temperatureC != null ? `${weather.temperatureC}°` : "--°"}<span className="temp-unit">C</span></div><div className="hero-condition-text">{weather?.weatherCondition || currentCondition.text}</div></div>
              </div>
              <div className="hero-feels-box"><div className="feels-label">{t("feelsLike")}</div><div className="feels-value">{weather?.apparentTemperatureC ?? "--"}°C</div><div className="minmax-row"><span>H: {weather?.today?.tempMaxC ?? "--"}°</span><span>L: {weather?.today?.tempMinC ?? "--"}°</span></div></div>
            </div>
            <div className="hero-metrics-strip">
              <div className="metric-chip"><span className="m-icon">🌧️</span><div><span className="m-label">{t("rainProbability")}</span><span className="m-val">{weather?.rainProbability ?? "--"}%</span></div></div>
              <div className="metric-chip"><span className="m-icon">💧</span><div><span className="m-label">{t("rainfall")}</span><span className="m-val">{weather?.rainfallMm ?? "--"} mm</span></div></div>
              <div className="metric-chip"><span className="m-icon">💨</span><div><span className="m-label">{t("windSpeed")}</span><span className="m-val">{weather?.windSpeedKmh ?? "--"} km/h</span></div></div>
              <div className="metric-chip"><span className="m-icon">💦</span><div><span className="m-label">{t("humidity")}</span><span className="m-val">{weather?.humidityPercent ?? "--"}%</span></div></div>
            </div>
          </div>

          {hourlyToday.length > 0 && <div className="dashboard-section-card"><div className="section-card-header"><div><h4>⏰ Today, hour by hour</h4><p className="section-subtext">Live temperature and rain probability</p></div><span className="section-meta">{hourlyToday.length} readings</span></div><div className="hourly-forecast-row">{hourlyToday.map((hour, index) => <div key={index} className="hourly-chip"><span className="hourly-time">{hourLabel(hour.time)}</span><span className="hourly-icon">{interpretWeatherCode(hour.weatherCode, isTamil).icon}</span><span className="hourly-temp">{hour.temperatureC ?? "--"}°</span><span className="hourly-rain">💧 {hour.rainProbability ?? "--"}%</span></div>)}</div></div>}

          <div className="prominent-advisory-section"><AdvisoryCard role={role} advisory={data?.roleAdvisory} title={role === "farmer" ? t("agriculturalAdvisory") : null} /></div>

        </div>

        <div className="home-outlook-layout">
          {dailyForecast.length > 0 && <div className="dashboard-section-card home-outlook-card"><div className="section-card-header"><h4>📅 {t("weeklyOutlook")}</h4><span className="section-meta">Multi-Day Ensemble</span></div><div className="daily-forecast-list">{dailyForecast.map((day, index) => <div key={index} className="daily-forecast-row"><span className="daily-name">{index === 0 ? "Today" : index === 1 ? "Tomorrow" : new Date(day.date).toLocaleDateString([], { weekday: "short" })}</span><span className="daily-icon">{interpretWeatherCode(day.weatherCode, isTamil).icon}</span><span className="daily-condition">{day.weatherCondition || "--"}</span><span className="daily-rain">💧 {day.rainProbability ?? "--"}%</span><div className="daily-temp-bar"><span className="t-min">{day.tempMinC ?? "--"}°</span><div className="t-bar"><div className="t-fill" style={{ width: `${Math.min(100, Math.max(20, ((day.tempMaxC ?? 0) - (day.tempMinC ?? 0)) * 8))}%` }}></div></div><span className="t-max">{day.tempMaxC ?? "--"}°</span></div></div>)}</div></div>}

          <div className="dashboard-sidebar-col">
            <div className="trust-score-section"><TrustScore trustData={data?.trustScore} clusterName={cluster.displayName || district} /></div>
            <div className="dashboard-feedback-section"><Feedback forecastId={`home_${cluster.clusterId || district.toLowerCase()}_${tomorrow?.date || "today"}`} lat={lat} lng={lng} role={role} district={district} onCalibrated={(newScore) => setData((previous) => ({ ...previous, trustScore: { ...previous?.trustScore, ...newScore } }))} /></div>
            <div className="demo-mode-panel"><div className="demo-header"><span className="demo-icon">🧪</span><span className="demo-title">{t("demoMode")}</span></div><p className="demo-desc">{t("demoModeDesc")}</p><button className="btn-secondary demo-trigger-btn" onClick={handleTriggerDemoAlert}>⚡ {t("simulatedDemoAlert")}</button></div>
          </div>
        </div>
      </div>
    </div>
  );
}
