import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./i18n/LanguageContext";
import "./index.css";

// `LanguageProvider` was never actually wired into the tree since the
// initial scaffold commit — every `useLanguage()` call (used throughout the
// presentation layer for `t()`) throws without it. Pre-existing app-shell
// wiring, fixed here rather than reproduced, since nothing renders without it.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
