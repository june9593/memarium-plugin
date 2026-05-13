import { defineConfig } from "astro/config";

// GitHub Pages serves project sites at /<repo>/. CI sets the env vars
// to the right canonical URL + base; locally we serve at /.
export default defineConfig({
  site: process.env.PAGES_URL || "http://localhost:4321",
  base: process.env.PAGES_BASE || "/",
  output: "static",
  trailingSlash: "always",
});
