import { describe, it, expect } from "vitest";
import { scanLeaks, hasBlockingLeak } from "../../src/memory/leak-scan.js";

describe("scanLeaks — machine-specific paths + secrets are blocking; SHAs/emails/GUIDs warn", () => {
  it("flags a local absolute home path as a blocking leak (Unix + Windows)", () => {
    const hits = scanLeaks("the fix is in /Users/yueliu/edge/PraestoClaw/apps/x.py near line 40");
    expect(hits.some((h) => h.kind === "home-path" && h.severity === "high")).toBe(true);
    expect(hasBlockingLeak("see /home/bob/proj/y.ts")).toBe(true);
    // Windows home path (backslashes) — the security backstop must cover it too
    expect(hasBlockingLeak("open C:\\Users\\alice\\proj\\x.ts")).toBe(true);
    // a non-Users Windows drive path is NOT a home path
    expect(hasBlockingLeak("build output at D:\\Projects\\repo\\dist")).toBe(false);
  });

  it("does NOT flag repo-relative paths (those are the desired form)", () => {
    expect(scanLeaks("edit apps/client_agent/praestoclaw/agent/tools/filesystem.py")).toEqual([]);
    expect(hasBlockingLeak("backend/services/supabase.py has class DBConnection")).toBe(false);
  });

  it("does NOT flag a `/home/`-or-`/Users/` substring inside a repo-relative or URL path (boundary-anchored)", () => {
    expect(hasBlockingLeak("the file is src/home/user/file.ts")).toBe(false);
    expect(hasBlockingLeak("fetch https://cdn.example.com/Users/avatars/x.png")).toBe(false);
    // but a genuine absolute path (start of token) is still caught
    expect(hasBlockingLeak("path=/home/bob/proj/y.ts")).toBe(true);
  });

  it("catches a terminal home path with no trailing slash (/Users/alice, /home/bob)", () => {
    expect(hasBlockingLeak("cd /Users/alice")).toBe(true);
    expect(hasBlockingLeak("the home dir is /home/bob")).toBe(true);
  });

  it("flags secret-shaped tokens as blocking", () => {
    expect(hasBlockingLeak("export TOKEN=ghp_ABCDEFGHIJKLMNOPQRST1234567890")).toBe(true); // ghp_ prefix
    expect(hasBlockingLeak("key sk-ABCdef0123456789ABCdef01")).toBe(true);
    expect(hasBlockingLeak("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcDEF")).toBe(true);
    expect(hasBlockingLeak("-----BEGIN RSA PRIVATE KEY-----")).toBe(true);
  });

  it("covers structured secret bodies (sk-proj-…, xoxc-…) without tripping hyphenated prose", () => {
    expect(hasBlockingLeak("OPENAI_API_KEY=sk-proj-abcDEF012_ghiJKL345mnoPQR")).toBe(true);
    expect(hasBlockingLeak("slack xoxc-1234567890-abcdefghij")).toBe(true);
    // "ask-me-…" contains the substring "sk-" but the \b anchor must not classify it
    expect(hasBlockingLeak("please ask-me-when-you-are-ready-okay-friend")).toBe(false);
  });

  it("redacts secret samples (never echoes the token) but keeps diagnostic samples for other kinds", () => {
    const secret = scanLeaks("key sk-ABCdef0123456789ABCdef01").find((h) => h.kind === "secret");
    expect(secret?.sample).toBe("[redacted]");
    expect(secret?.sample).not.toContain("ABCdef");
    const path = scanLeaks("see /home/bob/proj/y.ts").find((h) => h.kind === "home-path");
    expect(path?.sample).toContain("/home/bob"); // non-secret kinds keep the real sample
  });

  it("does NOT block normal prose / short hex / api names", () => {
    expect(hasBlockingLeak("VNRecognizeTextRequest infers vertical text from bbox aspect ratio")).toBe(false);
    expect(hasBlockingLeak("the flag is msMacLiquidGlassBubbles; color 0xFF00AA")).toBe(false);
  });

  it("flags a bare 40-hex commit SHA + email + GUID as WARN (not blocking)", () => {
    const sha = scanLeaks("fixed in f1e0435a7552b17a6d89e8ec01c1146704a5e0a0");
    expect(sha.some((h) => h.kind === "commit-sha" && h.severity === "warn")).toBe(true);
    expect(hasBlockingLeak("fixed in f1e0435a7552b17a6d89e8ec01c1146704a5e0a0")).toBe(false);
    // an UPPERCASE / mixed-case 40-hex SHA is still caught (case-insensitive)
    expect(scanLeaks("regressed in F1E0435A7552B17A6D89E8EC01C1146704A5E0A0").some((h) => h.kind === "commit-sha")).toBe(true);
    expect(scanLeaks("ping bob@contoso.com").some((h) => h.kind === "email")).toBe(true);
    expect(scanLeaks("tenant 72f988bf-86f1-41af-91ab-2d7cd011db47").some((h) => h.kind === "guid")).toBe(true);
  });
});
