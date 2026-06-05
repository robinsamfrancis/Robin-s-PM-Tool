// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { createLogger } from "vite";

const logger = createLogger();
const originalWarn = logger.warn;
logger.warn = (msg, options) => {
  if (msg.includes("Module level directives cause errors when bundled")) return;
  originalWarn(msg, options);
};

export default defineConfig({
  vite: {
    customLogger: logger,
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          if (
            warning.code === "MODULE_LEVEL_DIRECTIVE" ||
            warning.message.includes(
              "Module level directives cause errors when bundled",
            ) ||
            (warning.id && warning.id.includes("use client"))
          ) {
            return;
          }
          warn(warning);
        },
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    preset: process.env.VERCEL ? "vercel" : "node-server",
  },
});
