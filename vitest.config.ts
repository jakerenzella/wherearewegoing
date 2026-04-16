import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    alias: {
      "server-only": path.resolve(__dirname, "__tests__/server-only-mock.ts"),
      "@/": path.resolve(__dirname, "./") + "/",
    },
  },
});
