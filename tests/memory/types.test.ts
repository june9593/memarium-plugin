import { describe, it, expect } from "vitest";
import { memoryKey, type MemoryEntry } from "../../src/memory/types.js";

describe("memoryKey", () => {
  it("is just the id (ids are globally unique slugs)", () => {
    const e = { id: "core/yue-workflow", type: "core" } as MemoryEntry;
    expect(memoryKey(e)).toBe("core/yue-workflow");
  });
});
