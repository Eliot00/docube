import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { ContentConverter, type FileLike } from "docube";

import { makeMarkdownConverter } from ".";

describe("makeMarkdownConverter", () => {
  const buildTest = async (
    content: string,
    options: Parameters<typeof makeMarkdownConverter>[0],
  ) => {
    const file: FileLike = {
      _meta: {
        fileName: "test.md",
        directory: "/test",
      },
      text: Effect.succeed(content),
    };
    const converter = makeMarkdownConverter(options);
    const program = Effect.gen(function* () {
      const contentConverter = yield* ContentConverter;
      return yield* contentConverter.convert(file);
    });
    const result = await Effect.runPromise(
      program.pipe(Effect.provide(converter)),
    );
    return result as Record<PropertyKey, unknown>;
  };

  it("should convert simple Markdown to HTML", async () => {
    const result = await buildTest("# Hello World", {});
    expect(result.body).toContain("<h1>Hello World</h1>");
    expect(result._meta).toBeDefined();
  });

  it("should handle front matter with default extractor", async () => {
    const result = await buildTest("---\ntitle: Test\n---\n# Content", {});
    expect(result.title).toBe("Test");
    expect(result.body).toContain("<h1>Content</h1>");
  });

  it("should use custom frontMatterExtractor if provided", async () => {
    const result = await buildTest("# Content", {
      frontMatterExtractor: () => ({ custom: "data" }),
    });
    expect(result.custom).toBe("data");
  });

  it("should handle allowDangerousHtml option", async () => {
    const result = await buildTest("# Title\n\n<div>HTML content</div>", {
      allowDangerousHtml: true,
    });
    expect(result.body).toContain("<div>HTML content</div>");
  });

  it("should apply custom remark plugins", async () => {
    const result = await buildTest("# Original content", {
      remarkPlugins: [
        () => (tree) => {
          tree.children.push({
            type: "paragraph",
            children: [{ type: "text", value: "Added by plugin" }],
          });
        },
      ],
    });
    expect(result.body).toContain("Added by plugin");
  });

  it("should handle empty input", async () => {
    const result = await buildTest("", {});
    expect(result.body).toBe("");
  });
});
