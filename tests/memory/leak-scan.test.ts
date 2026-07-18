import { describe, it, expect } from "vitest";
import { scanLeaks, hasBlockingLeak } from "../../src/memory/leak-scan.js";

describe("scanLeaks — machine-specific paths + secrets are blocking; SHAs/emails/GUIDs warn", () => {
  it("flags a local absolute home path as a blocking leak", () => {
    const hits = scanLeaks("the fix is in /Users/yueliu/edge/PraestoClaw/apps/x.py near line 40");
    expect(hits.some((h) => h.kind === "home-path" && h.severity === "high")).toBe(true);
    expect(hasBlockingLeak("see /home/bob/proj/y.ts")).toBe(true);
  });

  it("does NOT flag repo-relative paths (those are the desired form)", () => {
    expect(scanLeaks("edit apps/client_agent/praestoclaw/agent/tools/filesystem.py")).toEqual([]);
    expect(hasBlockingLeak("backend/services/supabase.py has class DBConnection")).toBe(false);
  });

  it("flags secret-shaped tokens as blocking", () => {
    expect(hasBlockingLeak("export TOKEN=ghp_ABCDEFGHIJKLMNOPQRST1234567890")).toBe(true); // ghp_ prefix
    expect(hasBlockingLeak("key sk-ABCdef0123456789ABCdef01")).toBe(true);
    expect(hasBlockingLeak("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcDEF")).toBe(true);
    expect(hasBlockingLeak("-----BEGIN RSA PRIVATE KEY-----")).toBe(true);
  });

  it("does NOT block normal prose / short hex / api names", () => {
    expect(hasBlockingLeak("VNRecognizeTextRequest infers vertical text from bbox aspect ratio")).toBe(false);
    expect(hasBlockingLeak("the flag is msMacLiquidGlassBubbles; color 0xFF00AA")).toBe(false);
  });

  it("flags a bare 40-hex commit SHA + email + GUID as WARN (not blocking)", () => {
    const sha = scanLeaks("fixed in f1e0435a7552b17a6d89e8ec01c1146704a5e0a0");
    expect(sha.some((h) => h.kind === "commit-sha" && h.severity === "warn")).toBe(true);
    expect(hasBlockingLeak("fixed in f1e0435a7552b17a6d89e8ec01c1146704a5e0a0")).toBe(false);
    expect(scanLeaks("ping bob@contoso.com").some((h) => h.kind === "email")).toBe(true);
    expect(scanLeaks("tenant 72f988bf-86f1-41af-91ab-2d7cd011db47").some((h) => h.kind === "guid")).toBe(true);
  });
});
