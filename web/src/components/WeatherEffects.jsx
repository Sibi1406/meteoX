import { useLanguage } from "../i18n/LanguageContext";

function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function SunArc({ sunrise, sunset, now = new Date() }) {
  const { t, language } = useLanguage();
  const rise = validDate(sunrise);
  const set = validDate(sunset);
  if (!rise || !set || set <= rise) return null;

  const progress = Math.max(0, Math.min(1, (now.getTime() - rise.getTime()) / (set.getTime() - rise.getTime())));
  const x = 12 + progress * 176;
  const y = 58 - Math.sin(progress * Math.PI) * 42;
  const remainingMinutes = Math.max(0, Math.floor((set.getTime() - now.getTime()) / 60000));
  const timeOptions = { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" };
  const locale = language === "ta" ? "ta-IN" : "en-IN";

  return (
    <div className="sun-arc-panel" aria-label={`${t("sunrise")} ${rise.toLocaleTimeString(locale, timeOptions)}, ${t("sunset")} ${set.toLocaleTimeString(locale, timeOptions)}`}>
      <svg className="sun-arc" viewBox="0 0 200 68" role="presentation" aria-hidden="true">
        <path className="sun-arc-track" d="M12 58 A88 54 0 0 1 188 58" />
        <circle className="sun-arc-marker" cx={x} cy={y} r="7" />
      </svg>
      <div className="sun-arc-times">
        <span>{t("sunrise")} {rise.toLocaleTimeString(locale, timeOptions)}</span>
        <span>{t("sunset")} {set.toLocaleTimeString(locale, timeOptions)}</span>
      </div>
      {remainingMinutes > 0 && (
        <p className="daylight-remaining">
          {t("daylightRemaining")
            .replace("{hours}", Math.floor(remainingMinutes / 60))
            .replace("{minutes}", remainingMinutes % 60)}
        </p>
      )}
    </div>
  );
}

export function WeatherAtmosphere({ weather, conditionCode }) {
  const code = Number(conditionCode ?? weather?.weatherCode);
  const currentRain = Number(weather?.rainfallMm) || 0;
  const forecastProbability = Math.max(
    Number(weather?.today?.rainProbability) || 0,
    Number(weather?.tomorrow?.rainProbability) || 0
  );
  const rainingNow = currentRain > 0 || (code >= 51 && code <= 99);
  const rainExpected = rainingNow || forecastProbability >= 50;
  const layerCount = rainExpected
    ? Math.min(3, Math.max(1, Math.ceil(currentRain / 3)))
    : 0;
  const isStorm = code >= 95;

  return (
    <div className={`weather-atmosphere ${isStorm ? "storm-clouds" : ""}`} aria-hidden="true">
      <div className="weather-cloud-layer cloud-back" />
      <div className="weather-cloud-layer cloud-front" />
      {Array.from({ length: layerCount }, (_, index) => (
        <div key={index} className={`rain-layer rain-layer-${index + 1}`} />
      ))}
    </div>
  );
}