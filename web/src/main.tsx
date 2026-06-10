import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/base.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "./theme/ThemeProvider";
import { PanelProvider } from "./panel/PanelProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <PanelProvider>
        <App />
      </PanelProvider>
    </ThemeProvider>
  </StrictMode>,
);
