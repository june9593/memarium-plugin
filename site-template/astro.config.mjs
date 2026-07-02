import { defineConfig } from "astro/config";

// MEMARIUM_REPO_PATH points at the user's session-repo (set by `memarium
// serve` / `memarium build-site` before invoking astro). Default to
// `~/.memarium/session-repo` so `astro dev` works standalone too.
const repoPath =
  process.env.MEMARIUM_REPO_PATH ||
  `${process.env.HOME}/.memarium/session-repo`;

export default defineConfig({
  // Anything published-ish: GitHub Pages will set the right base via
  // MEMARIUM_SITE_BASE; for local dev we serve at /.
  site: process.env.MEMARIUM_SITE_URL || "http://localhost:4321",
  base: process.env.MEMARIUM_SITE_BASE || "/",
  output: "static",
  trailingSlash: "always",
  vite: {
    define: {
      "import.meta.env.MEMARIUM_REPO_PATH": JSON.stringify(repoPath),
    },
  },
  markdown: {
    syntaxHighlight: "shiki",
    shikiConfig: {
      // Light theme on parchment backgrounds; we explicitly do not switch on
      // prefers-color-scheme to keep the warm aesthetic.
      theme: "github-light",
      wrap: true,
    },
  },
});
