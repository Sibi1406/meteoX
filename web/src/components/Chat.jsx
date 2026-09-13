// components/Chat.jsx — Multilingual conversational advisory interface (Spec Item 6)
import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { api } from "../api";
import ChatMessage from "./ChatMessage";
import RoleIcon from "./RoleIcon";

export default function Chat({ profile }) {
  const { language, t } = useLanguage();
  const location = useLocation();
  const role = profile?.role || "farmer";

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
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const logRef = useRef(null);
  const recognitionRef = useRef(null);

  // Synchronize initial welcome message with language
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].isWelcome) {
        return [{ ...prev[0], text: t("chatWelcome") }];
      }
      return prev;
    });
  }, [language, t]);

  // Pre-fill query if passed from Home screen quick-prompts
  useEffect(() => {
    if (location.state?.initialPrompt) {
      setInput(location.state.initialPrompt);
    }
  }, [location.state]);

  // Auto-scroll feed
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Retrieve role-aware question chips (Spec Item 6)
  const rawRolePrompts = t("rolePrompts");
  const quickPrompts =
    (rawRolePrompts && typeof rawRolePrompts === "object" && rawRolePrompts[role]) || [
      t("quickPrompt1"),
      t("quickPrompt2"),
      t("quickPrompt3"),
    ];

  async function handleSend(customQuery = null) {
    const query = (customQuery || input).trim();
    if (!query || busy) return;

    setInput("");
    setMessages((prev) => [...prev, { sender: "user", text: query }]);
    setBusy(true);

    try {
      const lat = profile?.location?.latitude || 8.7139;
      const lng = profile?.location?.longitude || 77.7567;
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
    handleSend(promptText);
  }

  // Functional Web Speech API handler with graceful fallback (Spec Item 6)
  function handleToggleVoice() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(t("voiceComingSoon"));
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = language === "ta" ? "ta-IN" : "en-IN";
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => setListening(true);
      rec.onend = () => setListening(false);
      rec.onerror = (e) => {
        console.warn("Speech recognition error:", e);
        setListening(false);
      };
      rec.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInput(transcript);
          handleSend(transcript);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.warn("Could not start speech recognition:", e);
      setListening(false);
    }
  }

  function handleSpeak(text) {
    if (!window.speechSynthesis || !text) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "ta" ? "ta-IN" : "en-IN";
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  const isInitialState = messages.length === 1 && messages[0].isWelcome;

  return (
    <div className="chat-component">
      {/* Quick Prompts Bar (Top when chat is active) */}
      {!isInitialState && (
        <div className="quick-prompts-bar">
          {quickPrompts.map((p, idx) => (
            <button key={idx} className="quick-chip" onClick={() => handleQuickPrompt(p)}>
              ✨ {p}
            </button>
          ))}
        </div>
      )}

      {/* Chat Messages Feed */}
      <div className="chat-feed" ref={logRef}>
        {isInitialState ? (
          /* Reduced empty space on initial state (Spec Item 6) */
          <div className="chat-welcome-card">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <RoleIcon role={role} size={28} />
              <h3 style={{ margin: 0, fontSize: "18px" }}>
                {t("chatTitle")} • {t(role)}
              </h3>
            </div>
            <p className="chat-welcome-text">{messages[0].text}</p>

            <div style={{ marginTop: "8px" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  marginBottom: "10px",
                }}
              >
                {t("quickPromptsLabel")}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    className="quick-chip"
                    onClick={() => handleQuickPrompt(p)}
                    style={{ fontSize: "13px", padding: "8px 14px" }}
                  >
                    ✨ {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((m, idx) => (
            <ChatMessage
              key={idx}
              message={m}
              profile={profile}
              onSpeak={handleSpeak}
              speaking={speaking}
              onFeedbackCalibrated={(newScore) => {
                // Feedback calibrated
              }}
            />
          ))
        )}

        {busy && (
          <div className="chat-row bot">
            <div className="bubble bot thinking-bubble">
              <span className="dot-pulse"></span> {t("thinking")}
            </div>
          </div>
        )}
      </div>

      {/* Message Composer */}
      <div className="chat-composer">
        <button
          className={`mic-btn ${listening ? "listening" : ""}`}
          title={listening ? "Listening..." : t("micPlaceholder")}
          onClick={handleToggleVoice}
          aria-label="Voice input"
        >
          {listening ? "🔴" : "🎙️"}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={t("chatPlaceholder")}
          disabled={busy}
        />
        <button className="send-btn" onClick={() => handleSend()} disabled={busy || !input.trim()}>
          {t("send")}
        </button>
      </div>
    </div>
  );
}
