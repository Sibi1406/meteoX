import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LanguageProvider } from "./i18n/LanguageContext";
import App from "./App.jsx";
import KolamIntro from "./components/KolamIntro";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <KolamIntro />
        <App />
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
