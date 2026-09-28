import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { api, interpretWeatherCode } from "../api";
import AdvisoryCard from "../components/AdvisoryCard";
import AlertCard from "../components/AlertCard";
import Feedback from "../components/Feedback";
import Loading from "../components/Loading";
import RoleIcon from "../components/RoleIcon";
import TrackRecordGrid from "../components/TrackRecordGrid";
import ModelVotes from "../components/ModelVotes";
import ActionWindows from "../components/ActionWindows";
import DriftChip from "../components/DriftChip";
import { IsobarContours } from "../components/IsobarIntro";
import { SunArc, WeatherAtmosphere } from "../components/WeatherEffects";
import useTilt from "../hooks/useTilt";
import { rainColor, tempColor } from "../utils/weatherColors";
import { getSkyPhase, storeSkyTimes } from "../utils/skyPhase";

export default function Home({ profile }) {
  const { language, t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingFeedback, setPendingFeedback] = useState(null);
  const [simulatedAlert, setSimulatedAlert] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const weatherCardRef = useTilt();

  const lat = profile?.location?.latitude || 8.7139;
  const lng = profile?.location?.longitude || 77.7567;
  const role = profile?.role || "farmer";
  const district = profile?.location?.district || "Tirunelveli";
  const clusterData = profile?.location?.cluster;
  const isTamil = language === "ta";

  const resolvedClusterId = clusterData?.clusterId || (district ? district.toLowerCase().replace(/\s+/g, "") : "tirunelveli");

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

  useEffect(() => {
    const sunrise = data?.weather?.sunrise || data?.weather?.today?.sunrise;
    const sunset = data?.weather?.sunset || data?.weather?.today?.sunset;
    storeSkyTimes([
      { sunrise, sunset },
      { sunrise: data?.weather?.tomorrow?.sunrise, sunset: data?.weather?.tomorrow?.sunset },
    ]);
    document.body.dataset.sky = getSkyPhase(
      sunrise,
      sunset,
      currentTime
    );
  }, [data?.weather?.sunrise, data?.weather?.sunset, data?.weather?.today?.sunrise, data?.weather?.today?.sunset, data?.weather?.tomorrow?.sunrise, data?.weather?.tomorrow?.sunset, currentTime]);

  async function handleTriggerDemoAlert() {
    try {
      const demoRes = await api.triggerDemoAlert({ alertType: "heavy_rain", role, language });
      setSimulatedAlert(demoRes.alert);
    } catch (err) {
      console.error("Demo alert error:", err);
    }
  }

  useEffect(() => {
    let isMounted = true;
    async function loadPendingFeedbackPrompt() {
      try {
        const result = await api.getPendingFeedbackPrompt({ clusterId: resolvedClusterId, languageCode: language });
        if (isMounted) setPendingFeedback(result);
      } catch (err) {
        console.error("Failed to load pending forecast feedback prompt:", err);
        if (isMounted) setPendingFeedback(null);
      }
    }
    loadPendingFeedbackPrompt();
    return () => { isMounted = false; };
  }, [resolvedClusterId, language]);

  if (loading) {
    return <div className="dashboard-loading-view"><Loading message={t("loadingDashboard")} /></div>;
  }

  const weather = data?.weather;
  const cluster = data?.cluster || clusterData || { clusterId: resolvedClusterId, displayName: district };
  const alerts = [...(data?.alerts || []), ...(simulatedAlert ? [simulatedAlert] : [])];
  const nowInIST = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(currentTime).map((part) => [part.type, part.value]));
  const currentDate = `${nowInIST.year}-${nowInIST.month}-${nowInIST.day}`;
  const hourlyToday = (weather?.hourly || []).filter((hour) => {
    const displayTime = hour.localTime || hour.time;
    const match = typeof displayTime === "string" && displayTime.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})/);
    if (!match) return false;
    const hourDate = match[1];
    const hourValue = Number(match[2]);
    return hourDate === currentDate && hourValue >= Number(nowInIST.hour);
  });
  const dailyForecast = weather?.daily || weather?.dailyForecast || [];
  const currentCondition = interpretWeatherCode(weather?.weatherCode ?? 0, isTamil);
  const weatherCode = Number(weather?.weatherCode ?? 0);
  const feedbackWeatherAccent = data?.severity === "urgent" || weatherCode >= 95
    ? "var(--alert-red)"
    : ((weatherCode >= 51 && weatherCode <= 82) || Number(weather?.rainfallMm) > 0)
      ? rainColor(Math.max((Number(weather?.rainfallMm) || 0) / 24, weatherCode >= 65 ? 8 : 0.5))
      : tempColor(weather?.temperatureC);

  function hourLabel(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleTimeString([], { hour: "numeric", timeZone: "Asia/Kolkata" });
  }

  function updatedLabel(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? t("updatedAgo")
      : `${t("updatedAt")} ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }

  return (
    <div className="page dashboard-page-wide home-intelligence-page">
      {/* Header bar */}
      <div className="dashboard-header-bar glass-card card-system">
        <IsobarContours className="dashboard-header-isobars" />
        <div className="location-cluster-title">
          <span className="live-radar-tag"><span className="live-dot-green"></span> {t("liveWeatherData")}</span>
          <h2>{cluster.displayName || district}</h2>
          <span className="coords-sub">{lat.toFixed(2)}°N, {lng.toFixed(2)}°E • {updatedLabel(weather?.timestamp)}</span>
        </div>
        <div className="header-badges">
          <span className="role-pill-badge" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <RoleIcon role={role} size={16} /><span>{t(role)}</span>
          </span>
          <span className="source-pill-badge">📡 {t("liveWeatherData")}</span>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="alerts-section">
          {alerts.map((alert, index) => <AlertCard key={index} alert={alert} />)}
        </div>
      )}

      {/* Main Grid: Left Primary Column & Right Sidebar Column */}
      <div className="dashboard-main-grid">
        {/* Left Column:
          1. Advisory headline first
            2. Current-conditions stat row
            3. ActionWindows
            4. DriftChip
            5. Hourly timeline
        */}
        <div className="dashboard-primary-col">
          {/* 1. Advisory headline first */}
          <div className="prominent-advisory-section">
            <AdvisoryCard
              role={role}
              advisory={data?.advisory}
              severity={data?.severity}
              footnote={t("advisoryFootnote")}
              showFacts={false}
            />
          </div>

          {/* 2. Current conditions stat row */}
          <div
            className="hero-weather-card-glass glass-card card-data"
            ref={weatherCardRef}
            style={{ "--temp-color": tempColor(weather?.temperatureC) }}
          >
            <WeatherAtmosphere weather={weather} conditionCode={weather?.weatherCode} />
            <div className="weather-card-content">
            <div className="hero-weather-top">
              <div className="hero-temp-group">
                <span className="hero-weather-icon">{currentCondition.icon}</span>
                <div>
                  <div className="hero-temp-large" style={{ color: tempColor(weather?.temperatureC) }}>
                    {weather?.temperatureC != null ? `${weather.temperatureC}°` : "--°"}
                    <span className="temp-unit" style={{ color: tempColor(weather?.temperatureC) }}>C</span>
                  </div>
                  <div className="hero-condition-text">{weather?.weatherCondition || currentCondition.text}</div>
                </div>
              </div>
              <div className="hero-feels-box">
                <div className="feels-label">{t("feelsLike")}</div>
                <div className="feels-value">{weather?.apparentTemperatureC ?? "--"}°C</div>
                <div className="minmax-row">
                  <span>H: {weather?.today?.tempMaxC ?? "--"}°</span>
                  <span>L: {weather?.today?.tempMinC ?? "--"}°</span>
                </div>
              </div>
            </div>
            <div className="weather-instruments">
              <SunArc
                sunrise={weather?.sunrise || weather?.today?.sunrise}
                sunset={weather?.sunset || weather?.today?.sunset}
                now={currentTime}
              />
            </div>
            <div className="hero-metrics-strip">
              <div className="metric-chip"><span className="m-icon">🌧️</span><div><span className="m-label">{t("rainProbability")}</span><span className="m-val">{weather?.rainProbability ?? "--"}%</span></div></div>
              <div className="metric-chip"><span className="m-icon">💧</span><div><span className="m-label">{t("rainfall")}</span><span className="m-val">{weather?.rainfallMm ?? "--"} mm</span></div></div>
              <div className="metric-chip"><span className="m-icon">💨</span><div><span className="m-label">{t("windSpeed")}</span><span className="m-val">{weather?.windSpeedKmh ?? "--"} km/h</span></div></div>
              <div className="metric-chip"><span className="m-icon">💦</span><div><span className="m-label">{t("humidity")}</span><span className="m-val">{weather?.humidityPercent ?? "--"}%</span></div></div>
            </div>
            </div>
          </div>

          {/* 3. ActionWindows */}
          {Array.isArray(data?.actionWindows) && data.actionWindows.length > 0 && (
            <ActionWindows windows={data.actionWindows} isTamil={isTamil} role={role} />
          )}

          {/* 4. DriftChip */}
          {data?.drift && (
            <div className="drift-chip-wrapper">
              <DriftChip drift={data.drift} isTamil={isTamil} />
            </div>
          )}

          {/* 5. Hourly today */}
          {hourlyToday.length > 0 && (
            <div className="dashboard-section-card glass-card card-data">
              <div className="section-card-header">
                <div>
                  <h4>⏰ Today, hour by hour</h4>
                  <p className="section-subtext">Live temperature and rain probability</p>
                </div>
                <span className="section-meta">{hourlyToday.length} readings</span>
              </div>
              <div className="hourly-forecast-row">
                {hourlyToday.map((hour, index) => (
                  <div key={index} className="hourly-chip">
                    <span className="hourly-time">{hourLabel(hour.time)}</span>
                    <span className="hourly-icon">{interpretWeatherCode(hour.weatherCode, isTamil).icon}</span>
                    <span className="hourly-temp" style={{ color: tempColor(hour.temperatureC) }}>{hour.temperatureC ?? "--"}°</span>
                    <span className="hourly-temp-bar" style={{ "--temp-color": tempColor(hour.temperatureC) }} aria-hidden="true"><span /></span>
                    <span className="hourly-rain">💧 {hour.rainProbability ?? "--"}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar Column:
            1. TrackRecordGrid (replaces standalone insufficient data card)
            2. ModelVotes
            3. Feedback Prompt (if pending or user clicks rate forecast)
            4. Demo Mode panel
        */}
        <div className="dashboard-sidebar-col">
          {/* 1. TrackRecordGrid */}
          <div className="track-record-section">
            <TrackRecordGrid
              trackRecord={data?.trackRecord}
              trustScore={data?.trustScore}
              rainDayMm={data?.rainDayMm}
              clusterName={cluster.displayName || district}
              isTamil={isTamil}
            />
          </div>

          {/* 2. ModelVotes */}
          <div className="model-votes-section">
            <ModelVotes
              modelAgreement={weather?.modelAgreement}
              isTamil={isTamil}
            />
          </div>

          {/* 3. Feedback section */}
          <div className="dashboard-feedback-section">
            <Feedback
              clusterId={cluster.clusterId || resolvedClusterId}
              forecastDate={pendingFeedback?.forecastDate}
              lat={lat}
              lng={lng}
              role={role}
              district={district}
              question={pendingFeedback?.predictionSummary || t("forecastAccuracyQuestion")}
              prompt={pendingFeedback ? t("feedbackPrompt") : t("feedbackWaitingForVerifiedForecast")}
              canSubmit={Boolean(pendingFeedback)}
              weatherAccent={feedbackWeatherAccent}
              onSubmitted={() => {
                setPendingFeedback(null);
              }}
              onCalibrated={(newScore) =>
                setData((prev) => ({
                  ...prev,
                  trustScore: { ...prev?.trustScore, ...newScore },
                }))
              }
            />
          </div>

          {/* 4. Demo mode */}
          <div className="demo-mode-panel glass-card card-system">
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

      {/* Demoted 7-day outlook list below */}
      {dailyForecast.length > 0 && (
        <div className="dashboard-section-card home-outlook-card glass-card card-data demoted-outlook">
          <div className="section-card-header">
            <h4>📅 {t("weeklyOutlook")}</h4>
            <span className="section-meta">
              {weather?.modelAgreement ? "Multi-Model Ensemble" : t("singleModelForecast")}
            </span>
          </div>
          <div className="daily-forecast-list">
            {dailyForecast.map((day, index) => (
              <div key={index} className="daily-forecast-row">
                <span className="daily-name">
                  {index === 0 ? "Today" : index === 1 ? "Tomorrow" : new Date(day.date).toLocaleDateString([], { weekday: "short" })}
                </span>
                <span className="daily-icon">{interpretWeatherCode(day.weatherCode, isTamil).icon}</span>
                <span className="daily-condition">{day.weatherCondition || "--"}</span>
                <span className="daily-rain">
                  💧 {day.rainProbability ?? "--"}%
                  <span className="daily-rain-track" aria-hidden="true">
                    <span
                      className="daily-rain-fill"
                      style={{
                        width: `${Math.max(0, Math.min(100, day.rainProbability ?? 0))}%`,
                        "--rain-color": rainColor((day.rainfallMm ?? 0) / 24),
                      }}
                    />
                  </span>
                </span>
                <div className="daily-temp-bar">
                  <span className="t-min">{day.tempMinC ?? "--"}°</span>
                  <div className="t-bar">
                    <div
                      className="t-fill"
                      style={{
                        width: `${Math.min(100, Math.max(20, ((day.tempMaxC ?? 0) - (day.tempMinC ?? 0)) * 8))}%`,
                        "--temp-color": tempColor(((day.tempMaxC ?? 0) + (day.tempMinC ?? 0)) / 2),
                      }}
                    />
                  </div>
                  <span className="t-max">{day.tempMaxC ?? "--"}°</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
