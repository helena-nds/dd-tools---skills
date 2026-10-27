// vitest.config.mts: unit tests and synchronous component tests (async Server Components are tested with E2E).
// Vitest 5 uses Vite 8, which resolves tsconfig aliases (@/…) without a plugin.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
  },
});
