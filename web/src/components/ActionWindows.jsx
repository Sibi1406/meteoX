// components/ActionWindows.jsx — Visual role action windows with basis metrics (Spec Section 4)
import { useLanguage } from "../i18n/LanguageContext";

function formatHourRange(startISO, endISO, isTamil = false) {
  if (!startISO) return "";
  const start = new Date(startISO);
  const end = endISO ? new Date(endISO) : null;

  if (Number.isNaN(start.getTime())) return "";

  const timeOptions = {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  };

  const startFormatted = start.toLocaleTimeString(isTamil ? "ta-IN" : "en-US", timeOptions);
  if (!end || Number.isNaN(end.getTime()) || start.getTime() === end.getTime()) {
    return startFormatted;
  }

  end.setTime(end.getTime() + 60 * 60 * 1000);
  const endFormatted = end.toLocaleTimeString(isTamil ? "ta-IN" : "en-US", timeOptions);
  return `${startFormatted} – ${endFormatted}`;
}

function getSprayExplanation(window, t) {
  if (window.type === "spray_window") return t("sprayWindowExplanation");
  if (window.type !== "no_spray_window") return null;

  const blocker = window.basis?.[0];
  const messages = {
    rainProbability: "sprayBlockedByRain",
    windSpeed: "sprayBlockedByWind",
    temperature: "sprayBlockedByHeat",
  };
  const message = messages[blocker?.metric];
  if (!message) return t("sprayNoSuitableWindow");

  const value = Number.isFinite(Number(blocker.value)) ? Math.round(Number(blocker.value)) : "--";
  return t(message).replace("{value}", value);
}

export default function ActionWindows({ windows = [], isTamil = false }) {
  const { t } = useLanguage();

  if (!Array.isArray(windows) || windows.length === 0) {
    return null;
  }

  const typeTitles = {
    spray_window: t("sprayWindow"),
    no_spray_window: t("noSprayWindow"),
    sea_window: t("seaWindow"),
    sea_window_unsafe: t("seaWindowUnsafe"),
    heat_avoid: t("heatAvoid"),
    peak_rain: t("peakRain"),
    peak_rain_moderate: t("peakRain"),
  };

  const typeIcons = {
    spray_window: "🌱",
    no_spray_window: "⚠️",
    sea_window: "⚓",
    sea_window_unsafe: "🌊",
    heat_avoid: "🔥",
    peak_rain: "🌧️",
    peak_rain_moderate: "💧",
  };
  const severityLabels = {
    info: t("windowSeverityInfo"),
    caution: t("windowSeverityCaution"),
    avoid: t("windowSeverityAvoid"),
  };
  const metricLabels = {
    rainProbability: t("metricRainProbability"),
    windSpeed: t("metricWindSpeed"),
    windGust: t("metricWindGust"),
    temperature: t("metricTemperature"),
    apparentTemperature: t("metricApparentTemperature"),
    rainfall: t("metricRainfall"),
    forecastData: t("metricForecastData"),
  };
  const now = Date.now();
  const dayEnd = now + 24 * 60 * 60 * 1000;
  const timelineSegments = windows.flatMap((win, index) => {
    if (!win.startISO || !win.endISO) return [];
    const start = new Date(win.startISO).getTime();
    const end = new Date(win.endISO).getTime() + 60 * 60 * 1000;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
    const clippedStart = Math.max(now, start);
    const clippedEnd = Math.min(dayEnd, end);
    if (clippedEnd <= clippedStart) return [];
    const severity = ["info", "caution", "avoid"].includes(win.severity) ? win.severity : "info";
    return [{
      key: `${win.id || win.type}-${index}`,
      title: typeTitles[win.type] || t("metricUnknown"),
      severity,
      left: `${((clippedStart - now) / (24 * 60 * 60 * 1000)) * 100}%`,
      width: `${Math.max(1, ((clippedEnd - clippedStart) / (24 * 60 * 60 * 1000)) * 100)}%`,
    }];
  });

  return (
    <div className="action-windows-section">
      <div className="action-windows-header">
        <span className="action-windows-icon">⏳</span>
        <h4>{t("actionWindowsTitle")}</h4>
      </div>

      <div className="action-timeline" role="img" aria-label={t("actionTimelineLabel")}>
        <div className="action-timeline-track">
          {timelineSegments.map((segment) => (
            <span
              key={segment.key}
              className={`action-timeline-segment severity-${segment.severity}`}
              style={{ left: segment.left, width: segment.width }}
              title={segment.title}
            />
          ))}
        </div>
        <div className="action-timeline-labels">
          <span>{t("actionTimelineNow")}</span>
          <span>{t("actionTimelineEnd")}</span>
        </div>
      </div>

      <div className="action-windows-list">
        {windows.map((win, idx) => {
          const title = typeTitles[win.type] || win.type.replace(/_/g, " ");
          const icon = typeIcons[win.type] || "⏱️";
          const timeRange = formatHourRange(win.startISO, win.endISO, isTamil);
          const explanation = getSprayExplanation(win, t);
          const severityClass = ["info", "caution", "avoid"].includes(win.severity)
            ? win.severity
            : "info";
          const statusLabel = win.type === "spray_window"
            ? t("sprayForecastSuitable")
            : win.type === "no_spray_window"
              ? t("sprayWaitAndRecheck")
              : severityLabels[severityClass];

          return (
            <div
              key={`${win.id || win.type}-${idx}`}
              className={`action-window-card glass-card severity-${severityClass}`}
            >
              <div className="action-window-top">
                <div className="action-window-title-group">
                  <span className="window-icon" aria-hidden="true">{icon}</span>
                  <span className="window-title">{title}</span>
                </div>
                <span className={`window-severity-pill severity-${severityClass}`}>
                  {statusLabel}
                </span>
              </div>

              {timeRange && (
                <div className="action-window-time">
                  <span className="time-icon">⏰</span>
                  <span className="time-range-text">{timeRange} (IST)</span>
                </div>
              )}

              {explanation && <p className="action-window-explanation">{explanation}</p>}

              {Array.isArray(win.basis) && win.basis.length > 0 && (
                <div className="action-window-basis-strip">
                  {win.basis.map((b, bIdx) => (
                    <span key={bIdx} className="basis-chip">
                      <strong>{metricLabels[b.metric] || t("metricUnknown")}:</strong> {b.value ?? "--"} {b.unit}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
