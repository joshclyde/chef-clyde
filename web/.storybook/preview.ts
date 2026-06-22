// Global styles, mirroring the order in web/src/main.tsx so design tokens,
// the reset, and base element styles apply to every story.
import "../src/styles/reset.css";
import "../src/styles/tokens.css";
import "../src/styles/base.css";

import type { Preview } from "@storybook/react-vite";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    layout: "centered",
    a11y: {
      // Surface a11y findings in the panel without failing the test run.
      test: "todo",
    },
  },
  // Light/dark toggle in the toolbar. The app drives theming purely off the
  // `data-theme` attribute on <html> (see web/src/theme/ThemeProvider.tsx), so
  // the decorator just sets that attribute — no need for the app's ThemeProvider.
  initialGlobals: {
    theme: "light",
  },
  globalTypes: {
    theme: {
      description: "Color theme",
      toolbar: {
        title: "Theme",
        icon: "contrast",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = (context.globals.theme as string) ?? "light";
      document.documentElement.setAttribute("data-theme", theme);
      return Story();
    },
  ],
};

export default preview;
