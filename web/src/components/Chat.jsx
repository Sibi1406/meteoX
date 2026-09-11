// components/Chat.jsx — Multilingual conversational advisory interface (Spec §27)
import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { api } from "../api";
import ChatMessage from "./ChatMessage";

export default function Chat({ profile }) {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: t("chatWelcome"),
      isWelcome: true,
      advisory: null,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef(null);

  // Keep single initial welcome message synchronized with active language
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].isWelcome) {
        return [{ ...prev[0], text: t("chatWelcome") }];
      }
      return prev;
    });
  }, [language, t]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const query = input.trim();
    if (!query || busy) return;

    setInput("");
    setMessages((prev) => [...prev, { sender: "user", text: query }]);
    setBusy(true);

    try {
      const lat = profile?.location?.latitude || 8.7139;
      const lng = profile?.location?.longitude || 77.7567;
      const role = profile?.role || "farmer";
      const district = profile?.location?.district;
      const cluster = profile?.location?.cluster;

      const data = await api.handleQuery({
        query,
        lat,
        lng,
        role,
        languageCode: language,
        district,
        cluster,
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          queryId: data.queryId,
          forecastId: data.forecastId,
          advisory: data.advisory,
          weather: data.weather,
          localTrust: data.localTrust,
          text: data.advisory?.answer,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: t("chatError"),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function handleQuickPrompt(promptText) {
    setInput(promptText);
  }

  const quickPrompts = [
    t("quickPrompt1"),
    t("quickPrompt2"),
    t("quickPrompt3"),
  ];

  return (
    <div className="chat-component">
      {/* Quick Prompts Bar */}
      <div className="quick-prompts-bar">
        {quickPrompts.map((p, idx) => (
          <button key={idx} className="quick-chip" onClick={() => handleQuickPrompt(p)}>
            {p}
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div className="chat-feed" ref={logRef}>
        {messages.map((m, idx) => (
          <ChatMessage
            key={idx}
            message={m}
            profile={profile}
            onFeedbackCalibrated={(newScore) => {
              // Feedback calibrated
            }}
          />
        ))}
        {busy && (
          <div className="chat-row bot">
            <div className="bubble bot thinking-bubble">
              <span className="dot-pulse"></span> {t("thinking")}
            </div>
          </div>
        )}
      </div>

      {/* Message Composer with Microphone Placeholder (Spec §27) */}
      <div className="chat-composer">
        <button
          className="mic-btn"
          title={t("micPlaceholder")}
          onClick={() => alert(t("micPlaceholder"))}
        >
          🎙️
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={t("chatPlaceholder")}
        />
        <button className="send-btn" onClick={handleSend} disabled={busy || !input.trim()}>
          {t("send")}
        </button>
      </div>
    </div>
  );
}
