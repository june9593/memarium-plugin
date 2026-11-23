import { describe, it, expect } from "vitest";
import { scoreMemories, scoreArchived, usedIds, type MemoryQuery } from "../../src/memory/score.js";
import type { MemoryEntry } from "../../src/memory/types.js";

function e(over: Partial<MemoryEntry>): MemoryEntry {
  return {
    id: over.id ?? "x", type: over.type ?? "semantic", scope: over.scope ?? "project:p",
    project: over.project ?? "p", title: over.title ?? "", summary: over.summary ?? "",
    path: "memory/x.md", status: over.status ?? "active",
    confidence: over.confidence ?? 0.5, importance: over.importance ?? 1,
    createdAt: "2026-01-01", updatedAt: over.updatedAt ?? "2026-01-01",
    validFrom: null, validTo: over.validTo ?? null,
    sourceSessions: [], sourceCommits: [], sourceFiles: over.sourceFiles ?? [],
    supersedes: null, entities: over.entities ?? [], originDevice: null,
    accessCount: over.accessCount ?? 0, lastAccess: null,
  };
}

const Q = (over: Partial<MemoryQuery> = {}): MemoryQuery => ({
  project: "p", text: "", type: null, now: "2026-06-09", ...over,
});

describe("scoreMemories", () => {
  it("excludes superseded and expired entries", () => {
    const entries = [
      e({ id: "ok", title: "auth crash" }),
      e({ id: "old", title: "auth crash", status: "superseded" }),
      e({ id: "expired", title: "auth crash", validTo: "2026-01-01" }),
    ];
    const r = scoreMemories(entries, Q({ text: "auth" }));
    expect(r.map((x) => x.entry.id)).toEqual(["ok"]);
  });

  // Round-24: expiry was a RAW LEXICAL compare here, so an ISO TIMESTAMP validTo
  // sorted AFTER the plain `YYYY-MM-DD` now and a SAME-DAY-expiring entry stayed
  // recallable — while planArchival/memory-lint already called it expired. All the
  // expiry sites now normalize through the shared `calendarDate()` helper.
  it("excludes a SAME-DAY ISO TIMESTAMP validTo (matches planArchival/lint), keeps a future one", () => {
    const entries = [
      e({ id: "same-day", title: "auth crash", validTo: "2026-06-09T00:00:00Z" }),
      e({ id: "same-day-late", title: "auth crash", validTo: "2026-06-09T23:59:59Z" }),
      e({ id: "future", title: "auth crash", validTo: "2026-06-10T00:00:00Z" }),
    ];
    const r = scoreMemories(entries, Q({ text: "auth", now: "2026-06-09" }));
    expect(r.map((x) => x.entry.id)).toEqual(["future"]);
  });

  it("an UNPARSEABLE validTo is NOT treated as expired (it cannot be proven past)", () => {
    const entries = [
      e({ id: "garbage", title: "auth crash", validTo: "not-a-date" }),
      e({ id: "empty", title: "auth crash", validTo: "" }),
    ];
    const r = scoreMemories(entries, Q({ text: "auth" })).map((x) => x.entry.id).sort();
    expect(r).toEqual(["empty", "garbage"]);
  });

  it("keyword match in title/summary/entities raises score", () => {
    const entries = [
      e({ id: "match", title: "auth token crash", entities: ["AuthTokenView"] }),
      e({ id: "nomatch", title: "unrelated thing" }),
    ];
    const r = scoreMemories(entries, Q({ text: "auth crash" }));
    expect(r[0].entry.id).toBe("match");
    expect(r[0].whyRecalled).toContain("keyword");
  });

  it("a pure-Chinese query matches Chinese title/summary by adjacent-character pairs", () => {
    // The id tiebreak favours the distractor, so a zero keyword score can't pass.
    const entries = [
      e({ id: "a-export", title: "导出报表时合并重复行" }),
      e({ id: "b-import", title: "导入银行流水时按来源去重", summary: "去重键必须带上来源" }),
    ];
    const r = scoreMemories(entries, Q({ text: "导入去重" }));
    expect(r.map((x) => x.entry.id)).toEqual(["b-import", "a-export"]);
    expect(r[0].whyRecalled).toContain("keyword×2"); // 导入 + 去重; the spanning pair 入去 matches nothing
    expect(r[1].whyRecalled).not.toContain("keyword");
  });

  it("English words and identifiers tokenize as before, including next to Chinese", () => {
    const entries = [
      e({ id: "a-zh", title: "每批最多写五百行" }),
      e({ id: "b-ident", title: "MAX_BATCH_SIZE限制每批写入", summary: "parseAmount 和 SQLite 的变量上限" }),
    ];
    const r = scoreMemories(entries, Q({ text: "max_batch_size sqlite parseAmount" }));
    expect(r[0].entry.id).toBe("b-ident");
    expect(r[0].whyRecalled).toContain("keyword×3");
    expect(r[1].whyRecalled).not.toContain("keyword");
  });

  it("same-project entries outrank other-project on equal text", () => {
    const entries = [
      e({ id: "mine", project: "p", scope: "project:p", title: "auth flow" }),
      e({ id: "theirs", project: "q", scope: "project:q", title: "auth flow" }),
    ];
    const r = scoreMemories(entries, Q({ project: "p", text: "auth" }));
    expect(r[0].entry.id).toBe("mine");
    expect(r[0].whyRecalled).toContain("scope");
  });

  it("global/user scope always eligible regardless of project", () => {
    const entries = [e({ id: "rule", scope: "global", project: null, title: "never npm publish" })];
    const r = scoreMemories(entries, Q({ project: "anything", text: "publish" }));
    expect(r.map((x) => x.entry.id)).toEqual(["rule"]);
  });

  it("file-path overlap with query files boosts + explains", () => {
    const entries = [
      e({ id: "f", title: "x", sourceFiles: ["src/sources/base.ts"] }),
      e({ id: "g", title: "x" }),
    ];
    const r = scoreMemories(entries, Q({ text: "", files: ["src/sources/base.ts"] }));
    expect(r[0].entry.id).toBe("f");
    expect(r[0].whyRecalled).toContain("file");
  });

  it("type filter restricts results", () => {
    const entries = [
      e({ id: "c", type: "core", title: "rule", scope: "global", project: null }),
      e({ id: "s", type: "semantic", title: "rule" }),
    ];
    const r = scoreMemories(entries, Q({ text: "rule", type: "core" }));
    expect(r.map((x) => x.entry.id)).toEqual(["c"]);
  });

  it("scores finite when optional numerics (accessCount/importance) are missing", () => {
    const bad = e({ id: "match", title: "auth token crash", entities: ["AuthTokenView"] });
    delete (bad as unknown as Record<string, unknown>).accessCount;
    delete (bad as unknown as Record<string, unknown>).importance;
    const r = scoreMemories([bad], Q({ text: "auth crash" }));
    expect(Number.isFinite(r[0].score)).toBe(true);
    expect(r[0].whyRecalled).toContain("keyword");
  });

  it("a missing-accessCount keyword match still outranks a non-match (NaN would scramble the sort)", () => {
    // Pre-fix, Math.min(undefined,5)=NaN poisoned `score`; NaN comparisons in the
    // sort dropped entries to insertion order, so a clear match could sink.
    const match = e({ id: "match", title: "auth crash", entities: ["X"] });
    delete (match as unknown as Record<string, unknown>).accessCount;
    const nomatch = e({ id: "nomatch", title: "totally unrelated topic" });
    const r = scoreMemories([nomatch, match], Q({ text: "auth crash" }));
    expect(r[0].entry.id).toBe("match");
    for (const s of r) expect(Number.isFinite(s.score)).toBe(true);
  });

  it("a keyword content match outranks a high-importance non-match (importance can't dominate)", () => {
    // Pre-fix, importance was added raw: importance:9 (+9) beat a single keyword
    // hit (+5). Capped at 3, a content match always wins.
    const hot = e({ id: "hot", title: "completely unrelated", importance: 9 });
    const match = e({ id: "match", title: "bookmark stuff", importance: 0 });
    const r = scoreMemories([hot, match], Q({ text: "bookmark" }));
    expect(r[0].entry.id).toBe("match");
  });

  it("caps the importance contribution at 3 (importance 10 scores the same as importance 3)", () => {
    const lo = e({ id: "imp3", importance: 3 });
    const hi = e({ id: "imp10", importance: 10 });
    const r = scoreMemories([lo, hi], Q());
    const sLo = r.find((x) => x.entry.id === "imp3")!.score;
    const sHi = r.find((x) => x.entry.id === "imp10")!.score;
    expect(sHi).toBe(sLo);
  });

  it("excludes archived from primary recall, but scoreArchived returns them", () => {
    const entries = [
      e({ id: "semantic/p/live", title: "vim keybindings", status: "active" }),
      e({ id: "semantic/p/cold", title: "vim keybindings", status: "archived" }),
    ];
    const q = Q({ text: "vim" });
    const primary = scoreMemories(entries, q);
    expect(primary.map((x) => x.entry.id)).toEqual(["semantic/p/live"]);
    const cold = scoreArchived(entries, q);
    expect(cold.map((x) => x.entry.id)).toEqual(["semantic/p/cold"]);
  });
});

// Round-19: the memory index is read LENIENTLY on every READ surface, so a
// parseable-but-malformed row (`entities: {}`, `sourceFiles: "x"`) reaches the
// ranker. `scoreArchived` feeds EVERY archived row straight in, so an unguarded
// `.join()`/`.filter()` meant ONE corrupt archived row could throw and break
// /memarium-recall + memory-query entirely — worse than the write-path cases,
// because recall is the primary user-facing read. Ranking must degrade, never abort.
describe("ranking tolerates malformed collection fields (read path never throws)", () => {
  const corrupt = (over: Partial<MemoryEntry>, bad: Record<string, unknown>): MemoryEntry => {
    const row = e(over);
    Object.assign(row as unknown as Record<string, unknown>, bad);
    return row;
  };

  it("scoreArchived ranks a corrupt archived row without throwing (entities:{} / sourceFiles:'x' / sourceCommits:5)", () => {
    const rows = [
      corrupt({ id: "semantic/p/bad-entities", title: "vim keybindings", status: "archived" }, { entities: {} }),
      corrupt({ id: "semantic/p/bad-files", title: "vim keybindings", status: "archived" }, { sourceFiles: "src/a.ts" }),
      corrupt({ id: "semantic/p/bad-commits", title: "vim keybindings", status: "archived" }, { sourceCommits: 5 }),
      corrupt({ id: "semantic/p/bad-missing", title: "vim keybindings", status: "archived" }, { entities: undefined, sourceFiles: null }),
      e({ id: "semantic/p/good", title: "vim keybindings", status: "archived" }),
    ];
    const q = Q({ text: "vim", files: ["src/a.ts"], commits: ["deadbeef"] });
    let cold: ReturnType<typeof scoreArchived> = [];
    expect(() => { cold = scoreArchived(rows, q); }).not.toThrow();
    // The well-formed archived row is still surfaced, and every score is finite.
    expect(cold.map((x) => x.entry.id)).toContain("semantic/p/good");
    for (const s of cold) expect(Number.isFinite(s.score)).toBe(true);
  });

  it("a row with no `id` at all cannot break the sort tiebreak", () => {
    // Equal-scoring rows fall through to the `id.localeCompare` tiebreak, which
    // throws on a row whose `id` key the lenient reader let through as missing.
    const rows = [
      e({ id: "semantic/p/good", title: "vim keybindings", status: "archived" }),
      corrupt({ title: "vim keybindings", status: "archived" }, { id: undefined }),
      e({ id: "semantic/p/also", title: "vim keybindings", status: "archived" }),
      e({ id: "semantic/p/third", title: "vim keybindings", status: "archived" }),
    ];
    expect(() => scoreArchived(rows, Q({ text: "vim" }))).not.toThrow();
  });

  it("scoreMemories is defensive the same way, and well-formed ordering/scores are UNCHANGED", () => {
    const a = e({ id: "a", title: "auth crash", sourceFiles: ["src/auth.ts"] });
    const b = e({ id: "b", title: "auth thing", entities: ["AuthTokenView"] });
    const c = e({ id: "c", title: "totally unrelated" });
    const q = Q({ text: "auth crash", files: ["src/auth.ts"] });

    const baseline = scoreMemories([a, b, c], q).map((x) => [x.entry.id, x.score, x.whyRecalled]);

    const bad = corrupt({ id: "zbad", title: "auth crash" }, { entities: {}, sourceCommits: "abc" });
    let mixed: ReturnType<typeof scoreMemories> = [];
    expect(() => { mixed = scoreMemories([a, b, c, bad], q); }).not.toThrow();

    // Same rows, same scores, same relative order — the guard is a pure widening.
    expect(mixed.filter((x) => x.entry.id !== "zbad").map((x) => [x.entry.id, x.score, x.whyRecalled]))
      .toEqual(baseline);
  });
});

// Round-20: round-19's leniency stopped malformed rows from THROWING, but it
// still RANKED a row whose `id` the lenient index reader let through as
// missing/empty. Such a row can never be acted on — `memory-unarchive <id>`
// needs an id, and every recall surface cites one — so in the cold path it
// would consume one of the three COLD_TOP_K slots, hide a valid archived match,
// and render a restore hint naming `undefined`. Id-less rows are now dropped
// from the ranked candidates on BOTH paths (an id-less hit is equally useless
// in primary recall). Still no throw.
describe("ranking drops rows with no usable id (round-20)", () => {
  const corrupt = (over: Partial<MemoryEntry>, bad: Record<string, unknown>): MemoryEntry => {
    const row = e(over);
    Object.assign(row as unknown as Record<string, unknown>, bad);
    return row;
  };
  const arch = (id: string) => e({ id, title: "vim keybindings", status: "archived" });

  it("scoreArchived EXCLUDES an id-less archived row and never throws", () => {
    const rows = [
      corrupt({ title: "vim keybindings", status: "archived" }, { id: undefined }),
      corrupt({ title: "vim keybindings", status: "archived" }, { id: "" }),
      corrupt({ title: "vim keybindings", status: "archived" }, { id: 7 }),
      arch("semantic/p/good"),
    ];
    let cold: ReturnType<typeof scoreArchived> = [];
    expect(() => { cold = scoreArchived(rows, Q({ text: "vim" })); }).not.toThrow();
    expect(cold.map((x) => x.entry.id)).toEqual(["semantic/p/good"]);
  });

  it("an id-less archived row cannot consume a cold-storage slot (valid matches still surface)", async () => {
    const { runColdPass, COLD_TOP_K } = await import("../../src/memory/cold-pass.js");
    // The malformed row scores identically to the valid ones; with the sort's
    // String(id ?? "") tiebreak, "" sorts FIRST — so pre-fix it took slot 1 and
    // pushed the third valid match out of the top-K window.
    const entries = {
      "semantic/p/idless": corrupt({ title: "vim keybindings", status: "archived" }, { id: undefined }),
      "semantic/p/a": arch("semantic/p/a"), "semantic/p/b": arch("semantic/p/b"),
      "semantic/p/c": arch("semantic/p/c"),
    };
    const q = Q({ text: "vim" });
    const cold = runColdPass({ entries, scored: [], query: q, sources: {} });
    expect(cold.length).toBe(COLD_TOP_K);
    expect(cold.map((c) => c.id)).toEqual(["semantic/p/a", "semantic/p/b", "semantic/p/c"]);
    for (const c of cold) expect(typeof c.id === "string" && c.id.length > 0).toBe(true);
  });

  it("scoreMemories drops an id-less ACTIVE row too, leaving healthy ranking untouched", () => {
    const a = e({ id: "a", title: "auth crash", sourceFiles: ["src/auth.ts"] });
    const b = e({ id: "b", title: "auth thing", entities: ["AuthTokenView"] });
    const q = Q({ text: "auth crash", files: ["src/auth.ts"] });
    const baseline = scoreMemories([a, b], q).map((x) => [x.entry.id, x.score, x.whyRecalled]);
    const idless = corrupt({ title: "auth crash" }, { id: "" });
    let mixed: ReturnType<typeof scoreMemories> = [];
    expect(() => { mixed = scoreMemories([a, b, idless], q); }).not.toThrow();
    expect(mixed.map((x) => [x.entry.id, x.score, x.whyRecalled])).toEqual(baseline);
  });
});

describe("usedIds — which content hits are recorded as used", () => {
  const h = (id: string, title: string, whyRecalled = "keyword×1") => ({ id, whyRecalled, title, summary: "", entities: [] as string[] });

  it("drops function words only on word boundaries, including ones split across segments", () => {
    expect(usedIds([h("pay", "统一下单接口签名")], "统一下单", 5)).toEqual(["pay"]); // 一下 inside 统一下单 stays
    expect(usedIds([h("pay", "统一下单"), h("font", "怎么修改字体")], "如何统一下单", 5)).toEqual(["pay"]);
    expect(usedIds([h("db", "数据库恢复步骤"), h("font", "怎么才能修改字体")], "怎么才能恢复数据库", 5)).toEqual(["db"]);
    expect(usedIds([h("backup", "备份"), h("promo", "有没有优惠")], "有没有备份", 5)).toEqual(["backup"]); // 有|没有
  });

  it("needs two of the query's Chinese pairs, or its only one", () => {
    expect(usedIds([h("db", "数据库恢复步骤"), h("font", "恢复字体设置")], "怎么才能恢复数据库", 5)).toEqual(["db"]);
    expect(usedIds([h("dedup", "重复导入时去重")], "去重", 5)).toEqual(["dedup"]);
  });

  it("beside an English word a lone pair counts only for a memory the query names", () => {
    expect(usedIds([h("db", "SQLite 快照恢复步骤"), h("font", "恢复字体设置")], "SQLite 怎么恢复", 5)).toEqual(["db"]);
    expect(usedIds([h("ui", "按钮动画是怎么做的")], "SQLite 是怎么做的", 5)).toEqual([]);
    expect(usedIds([h("dedup", "去重"), h("font", "TODO：修改字体")], "TODO：去重", 5)).toEqual(["dedup", "font"]);
    expect(usedIds([{ ...h("rules", "流水归并规则"), entities: ["去重"] }], "TODO：去重", 5)).toEqual(["rules"]);
    expect(usedIds([h("grammar", "现在时")], "现在时", 5)).toEqual(["grammar"]); // 现在 is a function word
  });

  it("names a memory only by the whole query, a labelled topic or a quote", () => {
    const ui = (title: string, entities: string[] = []) => ({ ...h("ui", title), entities });
    expect(usedIds([h("gold", "PostgreSQL 连接池重连"), ui("测试")], "为什么 PostgreSQL 连接池偶尔超时，应该怎样测试重连逻辑？", 5)).toEqual(["gold"]);
    expect(usedIds([ui("测试")], "CPU 使用量需要先预测，试运行后怎么导出结果？", 5)).toEqual([]);
    expect(usedIds([ui("广告点击报表", ["数据"])], "SQLite 数据库的快照损坏后，怎样恢复订单记录？", 5)).toEqual([]);
    expect(usedIds([ui("日历组件", ["现在"])], "现在怎样排查支付失败？", 5)).toEqual([]);
    expect(usedIds([ui("测试")], "请查标题为「测试」的那条记忆", 5)).toEqual(["ui"]);
    expect(usedIds([ui("显示器色温校准", ["测试"])], "请查实体名为『测试』的那条记忆", 5)).toEqual(["ui"]);
  });

  it("an ASCII word, file or commit hit counts, within the first `limit` hits", () => {
    expect(usedIds([h("font", "怎么调整字体", "keyword×1 file×1")], "SQLite 怎么恢复", 5)).toEqual(["font"]);
    expect(usedIds([h("todo", "TODO：修改字体"), h("ledger", "修复重复入账")], "TODO：修复重复入账", 5)).toEqual(["todo", "ledger"]);
    expect(usedIds([h("a", "widget a"), h("b", "widget b")], "widget", 1)).toEqual(["a"]);
  });
});
