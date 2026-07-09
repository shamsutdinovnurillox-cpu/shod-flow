import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      // "server-only" faqat RSC muhitida import bo'ladi — testda bo'sh stub.
      "server-only": path.resolve(__dirname, "src/test/stubs/server-only.ts"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
