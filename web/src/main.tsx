import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/base.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "./theme/ThemeProvider";
import { AiMotionProvider } from "./ai/AiMotionProvider";
import { PanelProvider } from "./panel/PanelProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AiMotionProvider>
        <PanelProvider>
          <App />
        </PanelProvider>
      </AiMotionProvider>
    </ThemeProvider>
  </StrictMode>,
);
