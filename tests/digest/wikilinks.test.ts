import { describe, it, expect } from "vitest";
import { resolveWikiLinks } from "../../src/digest/wikilinks.js";
import type { BookIndexV2 } from "../../src/digest/book-index-v2.js";

function idx(): BookIndexV2 {
  return {
    version: 2,
    chronicles: {
      "fix-fullscreen": {
        threadId: "fix-fullscreen",
        project: "edge-src",
        title: "Fix fullscreen crash",
        sessionIds: ["s1"],
        path: "book/edge-src/chronicle/2026-05-13__fix-fullscreen__fix.md",
        createdAt: "2026-05-13",
        updatedAt: "2026-05-13",
        tags: [],
      } as BookIndexV2["chronicles"][string],
    },
    topics: {
      "edge-src/native-ui-fullscreen": {
        topicSlug: "native-ui-fullscreen",
        project: "edge-src",
        path: "book/edge-src/topics/native-ui-fullscreen.md",
        createdAt: "2026-05-13",
        updatedAt: "2026-05-13",
        contributingThreads: ["fix-fullscreen"],
      },
      // same slug in a DIFFERENT project — must not win cross-project when a
      // same-project candidate exists
      "chromium-src/native-ui-fullscreen": {
        topicSlug: "native-ui-fullscreen",
        project: "chromium-src",
        path: "book/chromium-src/topics/native-ui-fullscreen.md",
        createdAt: "2026-05-13",
        updatedAt: "2026-05-13",
        contributingThreads: [],
      },
    },
    cards: {},
  };
}

describe("resolveWikiLinks — topic links (vibebook-plugin)", () => {
  it("resolves [[topic/<slug>]] to a same-project relative path", () => {
    const { body, unresolved } = resolveWikiLinks(
      "See [[topic/native-ui-fullscreen]] for context.",
      {
        fromPath: "book/edge-src/chronicle/2026-05-13__fix-fullscreen__fix.md",
        fromProject: "edge-src",
        bookIndex: idx(),
      },
    );
    expect(unresolved).toEqual([]);
    // from book/edge-src/chronicle/ → book/edge-src/topics/native-ui-fullscreen.md
    expect(body).toContain("[native-ui-fullscreen](../topics/native-ui-fullscreen.md)");
  });

  it("prefers the link-source's own project when the slug recurs across projects", () => {
    const { body } = resolveWikiLinks(
      "[[topic/native-ui-fullscreen]]",
      {
        fromPath: "book/chromium-src/topics/some-other.md",
        fromProject: "chromium-src",
        bookIndex: idx(),
      },
    );
    // Should link to chromium-src's copy, not edge-src's
    expect(body).toContain("native-ui-fullscreen.md)");
    expect(body).not.toContain("edge-src/topics");
  });

  it("supports the alias form [[topic/<slug>|alt text]]", () => {
    const { body } = resolveWikiLinks(
      "[[topic/native-ui-fullscreen|Fullscreen UI]]",
      {
        fromPath: "book/edge-src/chronicle/x.md",
        fromProject: "edge-src",
        bookIndex: idx(),
      },
    );
    expect(body).toContain("[Fullscreen UI](../topics/native-ui-fullscreen.md)");
  });

  it("also accepts the [[topics/<slug>]] (plural) prefix", () => {
    const { body, unresolved } = resolveWikiLinks(
      "[[topics/native-ui-fullscreen]]",
      {
        fromPath: "book/edge-src/topics/other.md",
        fromProject: "edge-src",
        bookIndex: idx(),
      },
    );
    expect(unresolved).toEqual([]);
    expect(body).toContain("(native-ui-fullscreen.md)");
  });

  it("reports an unknown topic slug as unresolved and leaves the link as-is", () => {
    const { body, unresolved } = resolveWikiLinks(
      "[[topic/does-not-exist]]",
      {
        fromPath: "book/edge-src/topics/x.md",
        fromProject: "edge-src",
        bookIndex: idx(),
      },
    );
    expect(unresolved).toEqual(["topic/does-not-exist"]);
    expect(body).toContain("[[topic/does-not-exist]]");
  });

  it("still resolves chronicle + card links (regression guard)", () => {
    const i = idx();
    i.cards = {
      "edge-src/gotcha-foo": {
        cardSlug: "gotcha-foo",
        project: "edge-src",
        type: "gotcha",
        path: "book/edge-src/cards/gotcha-foo.md",
        createdAt: "2026-05-13",
        updatedAt: "2026-05-13",
        tags: [],
      } as BookIndexV2["cards"][string],
    };
    const { body, unresolved } = resolveWikiLinks(
      "[[chronicle/fix-fullscreen]] and [[gotcha-foo]]",
      {
        fromPath: "book/edge-src/topics/native-ui-fullscreen.md",
        fromProject: "edge-src",
        bookIndex: i,
      },
    );
    expect(unresolved).toEqual([]);
    expect(body).toContain("](../chronicle/2026-05-13__fix-fullscreen__fix.md)");
    expect(body).toContain("](../cards/gotcha-foo.md)");
  });
});
