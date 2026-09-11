// components/WeatherCard.jsx — Displays verified weather facts with source transparency (Spec §26, §43)
import { useLanguage } from "../i18n/LanguageContext";

export default function WeatherCard({ weather, title = null }) {
  const { t } = useLanguage();
  if (!weather) return null;

  const cardTitle = title || t("currentWeather");
  const temp = weather.temperatureC != null ? `${weather.temperatureC}°C` : "--";
  const rainProb = weather.rainProbability != null ? `${weather.rainProbability}%` : "--";
  const rainfall = weather.rainfallMm != null ? `${weather.rainfallMm} mm` : "0 mm";
  const humidity = weather.humidityPercent != null ? `${weather.humidityPercent}%` : "--";
  const wind = weather.windSpeedKmh != null ? `${weather.windSpeedKmh} km/h` : "--";

  return (
    <div className="weather-card">
      <div className="weather-card-header">
        <span className="weather-title">{cardTitle}</span>
        <span className="weather-badge">
          {weather.fromCache ? "⚡ Cached" : "🌐 Live Open-Meteo"}
        </span>
      </div>

      <div className="weather-main-row">
        <div className="temp-large">{temp}</div>
        <div className="condition-text">{weather.weatherCondition || "Clear sky"}</div>
      </div>

      <div className="weather-grid">
        <div className="weather-stat">
          <span className="stat-label">🌧 {t("rainProbability")}</span>
          <span className="stat-value">{rainProb}</span>
        </div>
        <div className="weather-stat">
          <span className="stat-label">💧 {t("rainfall")}</span>
          <span className="stat-value">{rainfall}</span>
        </div>
        <div className="weather-stat">
          <span className="stat-label">💨 {t("windSpeed")}</span>
          <span className="stat-value">{wind}</span>
        </div>
        <div className="weather-stat">
          <span className="stat-label">💦 {t("humidity")}</span>
          <span className="stat-value">{humidity}</span>
        </div>
      </div>

      {/* Source Transparency (Spec §43) */}
      <div className="source-transparency">
        <span>{t("source")}: Open-Meteo API</span>
        {weather.cacheFreshness && (
          <span>• {weather.cacheFreshness.ageMinutes}m ago</span>
        )}
      </div>
    </div>
  );
}
