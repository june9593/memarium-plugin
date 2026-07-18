// Leak scanner for memory content. High-severity hits (machine-specific absolute
// home paths, secret-shaped tokens) BLOCK a memory write (fail-closed, like the v4
// gate); warn-severity hits (bare commit SHAs, emails, GUIDs) surface via memory-lint
// but don't block — those have legitimate uses. This is the deterministic backstop
// for the digest occasionally memorizing machine-specific paths / secrets; the
// prose one-offs (a dev toggle, a "paste the token here" step) that carry no literal
// secret are NOT catchable here — those stay a prompt/human-review concern.

export type LeakKind = "home-path" | "secret" | "commit-sha" | "email" | "guid";
export type LeakSeverity = "high" | "warn";
export interface LeakHit { kind: LeakKind; severity: LeakSeverity; sample: string }

const PATTERNS: { kind: LeakKind; severity: LeakSeverity; re: RegExp }[] = [
  // A machine-specific absolute home path (a memory should use a repo-relative
  // path). The leading `(?<![\w/])` anchors it to an absolute path: a repo-relative
  // `src/home/user/…` or a URL path `…/home/user/…` — where the slash is preceded
  // by a word char or another slash — is deliberately NOT matched. The username
  // segment ends at a slash/whitespace/quote OR end-of-string, so a terminal path
  // like `/Users/alice` (no trailing slash) is still caught.
  { kind: "home-path", severity: "high", re: /(?<![\w/])(?:\/(?:Users|home)\/[^/\s'")]+|[A-Za-z]:\\Users\\)/ },
  // Secret-shaped tokens: OpenAI sk-/sk-proj-, GitHub PAT, Slack xox*, AWS AKIA, a
  // JWT, a PEM key. The `\b` before the group anchors the prefix (so hyphenated
  // prose like "ask-me-…" can't trip the sk- branch); bodies allow -/_ to cover
  // the newer sk-proj-… and structured Slack tokens without losing the min length.
  { kind: "secret", severity: "high", re: /\b(?:sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[a-z]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16})\b|eyJ[A-Za-z0-9_=-]{5,}\.[A-Za-z0-9_=-]{5,}\.[A-Za-z0-9_=-]+|-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  // Bare 40-hex git commit SHA (one-off identifier; ages out). Case-insensitive:
  // conventionally lowercase, but an uppercase/mixed paste is still a bare SHA.
  { kind: "commit-sha", severity: "warn", re: /\b[0-9a-f]{40}\b/i },
  { kind: "email", severity: "warn", re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i },
  { kind: "guid", severity: "warn", re: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i },
];

/** All distinct leak categories found in `text` (one hit per category, with a sample). */
export function scanLeaks(text: string): LeakHit[] {
  const hits: LeakHit[] = [];
  for (const p of PATTERNS) {
    const m = p.re.exec(text);
    if (m) {
      // Never echo secret material: both the write-guard error and memory-lint
      // serialize `sample`, so a real token would land in command output/logs.
      // Redact secret hits; keep a real, diagnostic sample for the other kinds.
      const sample = p.kind === "secret" ? "[redacted]" : m[0].slice(0, 60);
      hits.push({ kind: p.kind, severity: p.severity, sample });
    }
  }
  return hits;
}

/** True if `text` contains a high-severity leak (home path / secret) that must block a write. */
export function hasBlockingLeak(text: string): boolean {
  return scanLeaks(text).some((h) => h.severity === "high");
}

/** Minimal shape both memory-write and memory-propose feed the scanner. */
export interface LeakScannable { entry: { id: string; title: string; summary: string }; body: string }

/** Fail-closed guard for the write path: throw on the FIRST item whose title,
 *  summary, or body carries a high-severity leak (machine-specific home path or
 *  secret-shaped token), before anything is persisted. `cmd` names the caller so
 *  the error tells the digest which route rejected it. */
export function assertNoBlockingLeak(items: LeakScannable[], cmd: string): void {
  for (const { entry, body } of items) {
    const hit = scanLeaks(`${entry.title}\n${entry.summary}\n${body}`).find((h) => h.severity === "high");
    if (hit) {
      throw new Error(
        `${cmd}: refusing to write "${entry.id}" — it contains a ${hit.kind} leak (${JSON.stringify(hit.sample)}). ` +
        `Use a repo-relative path instead of an absolute home path, and never memorize a secret/token.`,
      );
    }
  }
}
