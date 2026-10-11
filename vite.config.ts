import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import { defineConfig } from "vitest/config";

// Content is hand-written YAML; it is parsed at build time, never in the browser.
const yamlPlugin = {
  name: "yaml",
  transform(_code: string, id: string) {
    if (!id.endsWith(".yaml")) return null;
    const data = yaml.load(readFileSync(id, "utf8"));
    return { code: `export default ${JSON.stringify(data)};`, map: null };
  },
};

export default defineConfig({
  // Relative base so the build works under any host path.
  base: "./",
  plugins: [yamlPlugin],
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
