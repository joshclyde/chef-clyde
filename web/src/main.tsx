import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/base.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AiMotionProvider } from "./ai/AiMotionProvider";
import { AiSettingsProvider } from "./ai/AiSettingsProvider";
import App from "./App.tsx";
import { PanelProvider } from "./panel/PanelProvider";
import { ThemeProvider } from "./theme/ThemeProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AiMotionProvider>
        <AiSettingsProvider>
          <PanelProvider>
            <App />
          </PanelProvider>
        </AiSettingsProvider>
      </AiMotionProvider>
    </ThemeProvider>
  </StrictMode>,
);
