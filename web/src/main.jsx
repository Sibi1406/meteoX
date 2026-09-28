import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LanguageProvider } from "./i18n/LanguageContext";
import App from "./App.jsx";
import IsobarIntro from "./components/IsobarIntro";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider>
        <IsobarIntro />
        <App />
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
