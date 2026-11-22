import { lstatSync, readFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { assertNoSymlinkedComponent } from "../qa/path-guard.js";
import { canonicalMemoryPath } from "./gate.js";
import type { MemoryView } from "./source-resolver.js";
import type { MemoryEntry } from "./types.js";

/** Largest .md the primer will read for a body; core rules are a few KB. */
const MAX_BODY_FILE_BYTES = 64 * 1024;

/** Read-only body lookup under `root` (the tree the entry came from). Resolves
 *  the entry's CANONICAL .md (derived from type/project/id; the indexed `path`
 *  is not trusted), refuses anything outside `memory/`, symlinked path
 *  components, non-files and oversized files, and requires the frontmatter id to
 *  match the entry. Recovers the body exactly as the strict rewrite reader in
 *  apply.ts does: drop the writer's one structural `# title` line and only
 *  structural newlines, so the author's own headings and indentation survive.
 *  Returns null on any doubt so the caller falls back to the summary. */
export function readEntryBody(root: string, entry: MemoryEntry): string | null {
  try {
    const memRoot = resolve(join(root, "memory"));
    const abs = resolve(join(root, canonicalMemoryPath(entry)));
    if (!abs.startsWith(memRoot + sep)) return null;
    assertNoSymlinkedComponent(root, abs, "memory body");
    const st = lstatSync(abs);
    if (!st.isFile() || st.size > MAX_BODY_FILE_BYTES) return null;
    const md = readFileSync(abs, "utf8").replace(/\r\n/g, "\n");
    const fm = md.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!fm) return null;
    const id = (fm[1]!.match(/^id:[ \t]*(.*)$/m)?.[1] ?? "").trim();
    if (id !== entry.id) return null;
    const afterFm = md.slice(fm[0].length);
    if (!/^\n*# [^\n]*/.test(afterFm)) return null;
    const body = afterFm.replace(/^\n*# [^\n]*\n*/, "").replace(/\n+$/, "");
    return body.trim() === "" ? null : body;
  } catch {
    return null;
  }
}

/** Body loader for entries taken from `view.entries`. Each entry is mapped back
 *  to its index key by object identity and its tree is read from `view.sources`
 *  under that key — the merger keys sources by map key, not by the embedded id
 *  (see resolveColdOrigin in cold-pass.ts). A missing or ambiguous key, a key
 *  that differs from the entry's id, or an unknown source yields null rather
 *  than a guess at the local tree. */
export function bodyLoader(view: MemoryView): (entry: MemoryEntry) => string | null {
  const keyOf = new Map<MemoryEntry, string | null>();
  for (const [key, e] of Object.entries(view.entries)) {
    if (!e || typeof e !== "object") continue;
    keyOf.set(e, keyOf.has(e) ? null : key);
  }
  return (entry) => {
    const key = keyOf.get(entry);
    if (key == null || key !== entry.id) return null;
    const source = view.sources[key];
    const root = source === "local" ? view.roots.local : source === "overlay" ? view.roots.overlay : null;
    return root ? readEntryBody(root, entry) : null;
  };
}
