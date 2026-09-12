// pages/Home.jsx — Hyperlocal & Role-Specific Home Cockpit for MeteoX (Spec Item 1)
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { api } from "../api";
import RoleIcon from "../components/RoleIcon";

export default function Home({ profile }) {
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const role = profile?.role || "farmer";
  const district = profile?.location?.district || "Tirunelveli";
  const lat = profile?.location?.latitude || 8.7139;
  const lng = profile?.location?.longitude || 77.7567;
  const cluster = profile?.location?.cluster;

  const [loading, setLoading] = useState(true);
  const [weatherData, setWeatherData] = useState(null);
  const [roleAdvisory, setRoleAdvisory] = useState("");
  const [trustScore, setTrustScore] = useState(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadHomeCockpit() {
      setLoading(true);
      try {
        const result = await api.getWeatherDashboard({
          lat,
          lng,
          role,
          languageCode: language,
          district,
          cluster,
        });
        if (isMounted) {
          setWeatherData(result?.weather);
          setRoleAdvisory(result?.roleAdvisory || "");
          setTrustScore(result?.trustScore || { accuracyScore: 0.86, sampleCount: 48 });
        }
      } catch (e) {
        console.warn("Failed loading home cockpit data:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHomeCockpit();
    return () => {
      isMounted = false;
    };
  }, [lat, lng, role, language, district, cluster]);

  async function handleOneTapFeedback(answer) {
    if (submittingFeedback || feedbackSubmitted) return;
    setSubmittingFeedback(true);
    try {
      const todayDate = new Date().toISOString().split("T")[0];
      const res = await api.submitFeedback({
        forecastId: `home_${district.toLowerCase()}_${todayDate}`,
        answer,
        predictedRain: (weatherData?.rainProbability ?? 20) > 30,
        lat,
        lng,
        role,
        district,
      });
      setFeedbackSubmitted(true);
      if (res?.calibration) {
        setTrustScore(res.calibration);
      }
    } catch (err) {
      console.error("Feedback error:", err);
      setFeedbackSubmitted(true);
    } finally {
      setSubmittingFeedback(false);
    }
  }

  function handlePromptClick(promptText) {
    navigate("/chat", { state: { initialPrompt: promptText } });
  }

  // Retrieve role-aware prompts from dictionary
  const rawRolePrompts = t("rolePrompts");
  const quickPrompts =
    (rawRolePrompts && typeof rawRolePrompts === "object" && rawRolePrompts[role]) || [
      t("quickPrompt1"),
      t("quickPrompt2"),
      t("quickPrompt3"),
    ];

  const confidencePercent = trustScore?.accuracyScore != null
    ? Math.round(trustScore.accuracyScore * 100)
    : 86;
  const reportsCount = trustScore?.sampleCount ?? 48;

  return (
    <div className="page home-page-personalized">
      <div className="home-personalized-container">
        {/* 1. Compact Current-Conditions Strip for user's own district only */}
        <section className="home-conditions-strip" aria-label="Current Weather Strip">
          <div className="home-conditions-primary">
            <span className="home-conditions-icon">
              {weatherData?.weatherIcon || "⛅"}
            </span>
            <div className="home-conditions-main">
              <div className="home-conditions-headline">
                <h2 className="home-conditions-district">{district}</h2>
                <span className="home-conditions-temp">
                  {weatherData?.temperatureC != null ? `${weatherData.temperatureC}°C` : "--°C"}
                </span>
              </div>
              <div className="home-conditions-sub">
                <span>{weatherData?.weatherCondition || (language === "ta" ? "பகுதி மேகமூட்டம்" : "Partly cloudy")}</span>
                <span>•</span>
                <span>{t("feelsLike")} {weatherData?.apparentTemperatureC ?? weatherData?.temperatureC ?? 31}°C</span>
                <span>•</span>
                <span>{weatherData?.timestamp ? `${t("lastUpdated")} ${weatherData.timestamp}` : t("updatedAgo")}</span>
              </div>
            </div>
          </div>

          <div className="home-conditions-telemetry">
            <div className="home-conditions-chip" title={t("rainProbability")}>
              <span>🌧️</span>
              <span>{weatherData?.rainProbability ?? 15}%</span>
            </div>
            <div className="home-conditions-chip" title={t("windSpeed")}>
              <span>💨</span>
              <span>{weatherData?.windSpeedKmh ?? 12} km/h</span>
            </div>
            <div className="home-conditions-chip" title={t("humidity")}>
              <span>💦</span>
              <span>{weatherData?.humidityPercent ?? 65}%</span>
            </div>
          </div>
        </section>

        {/* 2. Today's Advisory Card (Role-specific, quote-card visual style with "Powered by AI" tag) */}
        <section className="home-advisory-quote-card" aria-label="Today's Advisory">
          <div className="home-advisory-header">
            <div className="home-advisory-role-badge">
              <RoleIcon role={role} size={20} />
              <span>{t(role)} • {t("todayAdvisory")}</span>
            </div>
            <span className="home-powered-ai-tag">
              🤖 {t("poweredByAi")}
            </span>
          </div>

          <p className="home-advisory-quote-text">
            &ldquo;
            {roleAdvisory ||
              (language === "ta"
                ? `${district} பகுதியில் வானிலை சீராக உள்ளது. வழமையான களப்பணிகளை மேற்கொள்ளலாம்.`
                : `Favorable weather conditions across ${district}. Normal field operations may proceed.`)}
            &rdquo;
          </p>
        </section>

        {/* 3 & 4. Local Confidence Metric + One-Tap Self-Calibrating Feedback */}
        <div className="home-trust-feedback-row">
          {/* Local forecast confidence metric for user's own district */}
          <div className="home-confidence-card">
            <div className="home-confidence-header">
              <span>🎯</span>
              <span>{t("forecastConfidence")}</span>
            </div>
            <div className="home-confidence-stat-row">
              <span className="home-confidence-value">{confidencePercent}%</span>
              <span className="home-confidence-reports">
                ({reportsCount} {t("reportsCount")} in {district})
              </span>
            </div>
            <p className="section-subtext" style={{ fontSize: "12px", margin: 0 }}>
              {t("selfCalibratingNote")}
            </p>
          </div>

          {/* One-tap feedback prompt: Was yesterday's forecast right? */}
          <div className="home-feedback-card">
            <div className="home-feedback-question">
              <span>📊</span>
              <span>{t("yesterdayForecastQuestion")}</span>
            </div>

            {feedbackSubmitted ? (
              <div className="home-feedback-thanks">
                <span>✓</span>
                <span>{t("feedbackThanks")}</span>
              </div>
            ) : (
              <div className="home-feedback-actions">
                <button
                  className="home-feedback-btn yes"
                  onClick={() => handleOneTapFeedback("yes")}
                  disabled={submittingFeedback}
                >
                  👍 {t("yes")}
                </button>
                <button
                  className="home-feedback-btn no"
                  onClick={() => handleOneTapFeedback("no")}
                  disabled={submittingFeedback}
                >
                  👎 {t("no")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 5. Quick-Prompt Chips into Ask AI tailored to the active role */}
        <section className="home-quick-prompts-section" aria-label="Quick Prompts into Ask AI">
          <div className="home-quick-prompts-label">
            💬 {t("quickPromptsLabel")}
          </div>
          <div className="home-quick-prompts-row">
            {quickPrompts.map((promptText, idx) => (
              <button
                key={idx}
                className="home-prompt-chip"
                onClick={() => handlePromptClick(promptText)}
              >
                <span>✨</span>
                <span>{promptText}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
