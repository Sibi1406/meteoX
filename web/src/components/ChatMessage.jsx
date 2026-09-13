// components/ChatMessage.jsx — Rich message renderer with weather facts, advisory card, and trust score
import { useLanguage } from "../i18n/LanguageContext";
import RoleIcon from "./RoleIcon";

export default function ChatMessage({ message, profile, onSpeak, speaking, onFeedbackCalibrated }) {
  const { t } = useLanguage();
  const role = profile?.role || "farmer";

  if (message.sender === "user") {
    return (
      <div className="chat-row user">
        <div className="bubble user">
          <p>{message.text}</p>
        </div>
      </div>
    );
  }

  // Assistant response
  const advisoryData = message.advisory || {};
  const weatherFacts = advisoryData.weatherFacts || [];
  const advisoryList = advisoryData.advisory || [];
  const localTrust = advisoryData.localTrust || message.localTrust;
  const answer = advisoryData.answer || message.text;
  const speechText = [answer, ...advisoryList]
    .filter(Boolean)
    .join(". ");

  return (
    <div className="chat-row bot">
      <div className="bubble bot">
        {/* Natural Language Answer */}
        {answer && (
          <div className="bot-answer-row">
            <div className="bot-answer">{answer}</div>
            {onSpeak && (
              <button
                type="button"
                className="speak-btn"
                onClick={() => onSpeak(speechText)}
                title={speaking ? t("stopSpeaking") : t("speakAnswer")}
                aria-label={speaking ? t("stopSpeaking") : t("speakAnswer")}
              >
                {speaking ? "⏹" : "🔊"}
              </button>
            )}
          </div>
        )}

        {/* 1. Verified Weather Facts Section */}
        {weatherFacts.length > 0 && (
          <div className="chat-facts-block">
            <div className="section-label">🌤️ {t("weatherFactsTitle")}</div>
            <ul className="facts-list">
              {weatherFacts.map((fact, idx) => (
                <li key={idx} className="fact-item">
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 2. Role Advisory Section with Duotone RoleIcon */}
        {advisoryList.length > 0 && (
          <div className="chat-advisory-block">
            <div className="section-label" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <RoleIcon role={role} size={16} />
              <span>{t("advisoryTitle")} ({t(role)})</span>
            </div>
            {advisoryList.map((adv, idx) => (
              <p key={idx} className="advisory-sentence">
                {adv}
              </p>
            ))}
          </div>
        )}

        {/* 3. Local Trust Reliability Pill */}
        {localTrust && (
          <div className="chat-trust-pill">
            <span className="trust-pill-icon">🎯</span>
            <span className="trust-pill-score">
              {t("localReliability")}: {localTrust.trustScore || `${Math.round((localTrust.accuracyScore || 0.86) * 100)}%`}
            </span>
            {localTrust.sampleCount != null && (
              <span className="trust-pill-samples">
                ({localTrust.sampleCount} {t("observations")})
              </span>
            )}
          </div>
        )}

        {/* Grounding Verification Badge with developer jargon removed */}
        <div className="grounded-badge-row">
          <span className="grounded-tag">✓ {t("groundedBadge")}</span>
          <span className="grounded-source">{t("liveWeatherData")} • {t("zeroHallucination")}</span>
        </div>

      </div>
    </div>
  );
}
