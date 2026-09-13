// i18n/LanguageContext.jsx — Context provider for English / Tamil localization
import { createContext, useContext, useState, useEffect } from "react";
import { translations } from "./translations";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window === "undefined") return "en";
    return window.localStorage.getItem("weathergpt_lang") || "en";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("weathergpt_lang", language);
    }
  }, [language]);

  const t = (key) => {
    const normalizedKey = key === "city_admin" ? "cityAdmin" : key;
    return translations[language]?.[normalizedKey] || translations.en[normalizedKey] || translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
