import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { api } from "../api";

function getYesterdayISTDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const yesterday = new Date(Date.UTC(Number(dateParts.year), Number(dateParts.month) - 1, Number(dateParts.day) - 1));
  return yesterday.toISOString().slice(0, 10);
}

export default function Feedback({
  clusterId,
  forecastDate,
  lat,
  lng,
  role,
  district,
  onCalibrated,
  onSubmitted,
  question,
  prompt,
  canSubmit = true,
  weatherAccent = "var(--zenith)",
}) {
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [updatedScore, setUpdatedScore] = useState(null);
  const [submitError, setSubmitError] = useState(false);

  async function handleFeedback(forecastAccurate) {
    setSubmitting(true);
    try {
      const res = await api.submitFeedback({
        clusterId: clusterId || (district ? district.toLowerCase().replace(/\s+/g, "") : "tirunelveli"),
        forecastDate: forecastDate || getYesterdayISTDate(),
        forecastAccurate,
        lat: lat ?? 8.7139,
        lng: lng ?? 77.7567,
        role: role || "farmer",
        district: district || "Tirunelveli",
      });

      if (res?.feedbackGiven !== true) {
        throw new Error("Feedback was not confirmed by the server.");
      }
      setSubmitted(true);
      if (res?.calibration) {
        setUpdatedScore(res.calibration);
        if (onCalibrated) onCalibrated(res.calibration);
      }
      if (onSubmitted) onSubmitted();
    } catch (err) {
      console.error("Feedback submission error:", err);
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="feedback-container glass-card card-system submitted">
        <span className="check-icon">✓</span>
        <div className="feedback-submitted-text">
          <p>{t("feedbackThanks")}</p>
          {updatedScore && (
            <span className="calibrated-pill">
              {t("localReliability")}: {Math.round(updatedScore.accuracyScore * 100)}% ({updatedScore.sampleCount} {t("observations")})
            </span>
          )}
        </div>
      </div>
    );
  }

  const titleText = question || t("forecastAccuracyQuestion");
  const subtitleText = prompt || t("feedbackPrompt");
  const cardStyle = { "--feedback-weather-accent": weatherAccent };

  return (
    <div className="feedback-container glass-card card-system weather-themed" style={cardStyle}>
      <div className="feedback-header">
        <span className="feedback-icon">📊</span>
        <span className="feedback-question">{titleText}</span>
      </div>
      <p className="feedback-sub" role={canSubmit ? undefined : "status"}>{subtitleText}</p>
      {submitError && <p className="feedback-error" role="alert">{t("feedbackSubmitError")}</p>}

      <div className="feedback-buttons">
        <button
          className="btn-feedback yes"
          onClick={() => handleFeedback(true)}
          disabled={!canSubmit || submitting}
        >
          {t("forecastAccurateYes")}
        </button>
        <button
          className="btn-feedback no"
          onClick={() => handleFeedback(false)}
          disabled={!canSubmit || submitting}
        >
          {t("forecastAccurateNo")}
        </button>
      </div>
    </div>
  );
}
