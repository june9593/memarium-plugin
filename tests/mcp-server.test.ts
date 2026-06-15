import { describe, it, expect } from "vitest";
describe("mcp-server TOOLS", () => {
  it("registers exactly the 9 read-only tools with handler + inputSchema", async () => {
    const { TOOLS } = await import("../src/mcp-server.js");
    const names = TOOLS.map((t: { name: string }) => t.name).sort();
    expect(names).toEqual([
      "entity_query","list_projects","memory_diff","memory_lint","memory_primer",
      "memory_query","prepare","qa_query","recall",
    ]);
    for (const t of TOOLS) {
      expect(typeof t.handler).toBe("function");
      expect(t.inputSchema).toBeTypeOf("object");
    }
  });

  it("a read-only handler returns a structured object (memory_primer → string)", async () => {
    const { TOOLS } = await import("../src/mcp-server.js");
    const primer = TOOLS.find((t: { name: string }) => t.name === "memory_primer")!;
    const out = await primer.handler({ project_dir: "/nonexistent-xyz" });
    expect(typeof out).toBe("string"); // buildMemoryPrimer returns "" for unknown project, never throws
  });
});
