// components/ChatMessage.jsx — Rich message renderer with weather facts, advisory card, and trust score
import AdvisoryCard from "./AdvisoryCard";

export default function ChatMessage({ message, profile, onSpeak, speaking, onFeedbackCalibrated }) {
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

  const advisoryData = message.advisory || {};
  if (!advisoryData.headline && !advisoryData.action) {
    return (
      <div className="chat-row bot">
        <div className="bubble bot"><p>{message.text}</p></div>
      </div>
    );
  }

  return (
    <div className="chat-row bot response-message">
      <AdvisoryCard
        role={role}
        advisory={advisoryData}
        localTrust={advisoryData.localTrust || message.localTrust}
        onSpeak={onSpeak}
        speaking={speaking}
        showGroundedBadge
      />
    </div>
  );
}
