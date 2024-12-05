import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      ...configDefaults.coverage,
      exclude: [...configDefaults.coverage.exclude, "src/types/*"],
    },
  },
});
