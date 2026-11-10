import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    // Same shortcuts as tsconfig.json "paths": the ported components import next/* stand-ins.
    alias: [
      { find: /^next\/link$/, replacement: path.resolve(__dirname, "./src/shims/next-link.tsx") },
      { find: /^next\/navigation$/, replacement: path.resolve(__dirname, "./src/shims/next-navigation.ts") },
      { find: /^next\/image$/, replacement: path.resolve(__dirname, "./src/shims/next-image.tsx") },
      { find: /^next\/server$/, replacement: path.resolve(__dirname, "./src/shims/next-server.ts") },
      { find: /^next\/headers$/, replacement: path.resolve(__dirname, "./src/shims/next-headers.ts") },
      { find: /^next$/, replacement: path.resolve(__dirname, "./src/shims/next.ts") },
      { find: /^server-only$/, replacement: path.resolve(__dirname, "./src/shims/server-only.ts") },
      { find: /^@\//, replacement: path.resolve(__dirname, "./src") + "/" },
    ],
  },
});
