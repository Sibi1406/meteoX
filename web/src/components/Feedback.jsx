// components/Feedback.jsx — User feedback verification component (Spec §28, §32)
import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { api } from "../api";

export default function Feedback({ forecastId, lat, lng, role, district, onCalibrated }) {
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [updatedScore, setUpdatedScore] = useState(null);

  async function handleFeedback(answer) {
    setSubmitting(true);
    try {
      const res = await api.submitFeedback({
        forecastId: forecastId || "demo_forecast",
        answer,
        predictedRain: true,
        lat: lat || 8.7139,
        lng: lng || 77.7567,
        role: role || "farmer",
        district: district || "Tirunelveli",
      });

      setSubmitted(true);
      if (res?.calibration) {
        setUpdatedScore(res.calibration);
        if (onCalibrated) onCalibrated(res.calibration);
      }
    } catch (err) {
      console.error("Feedback submission error:", err);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="feedback-container submitted">
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

  return (
    <div className="feedback-container">
      <div className="feedback-header">
        <span className="feedback-icon">📊</span>
        <span className="feedback-question">{t("didItRain")}</span>
      </div>
      <p className="feedback-sub">{t("feedbackPrompt")}</p>

      <div className="feedback-buttons">
        <button
          className="btn-feedback yes"
          onClick={() => handleFeedback("yes")}
          disabled={submitting}
        >
          {t("yesRained")}
        </button>
        <button
          className="btn-feedback no"
          onClick={() => handleFeedback("no")}
          disabled={submitting}
        >
          {t("noRained")}
        </button>
      </div>
    </div>
  );
}
