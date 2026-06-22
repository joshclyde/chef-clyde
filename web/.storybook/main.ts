import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  // Storybook runs its own Vite dev server (it does not read web/vite.config.ts),
  // so re-apply the settings that let it be served through the shared host proxy
  // on port 5173 (see CLAUDE.md "Reaching clones by name").
  viteFinal: async (viteConfig) => {
    const { mergeConfig } = await import("vite");
    return mergeConfig(viteConfig, {
      server: {
        host: true,
        allowedHosts: [".localhost"],
        hmr: process.env.HMR_CLIENT_PORT
          ? { clientPort: Number(process.env.HMR_CLIENT_PORT) }
          : undefined,
      },
    });
  },
};

export default config;
