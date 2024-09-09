import { describe, expect, it } from "bun:test";
import { Unified, type FileLike } from "docube";
import { Effect } from "effect";

import { makeUnifiedLive } from ".";

describe("makeUnifiedLive", () => {
  const buildTest = async (
    content: string,
    options: Parameters<typeof makeUnifiedLive>[0],
  ) => {
    const file: FileLike = {
      _meta: {
        fileName: "test.md",
        directory: "/test",
      },
      text: Effect.succeed(content),
    };

    const processor = makeUnifiedLive(options);
    const program = Effect.gen(function* () {
      const processor = yield* Unified;
      return yield* file.text.pipe(Effect.andThen(processor.process));
    });
    const result = await Effect.runPromise(
      program.pipe(Effect.provide(processor)),
    );
    return result;
  };

  it("should apply rehype plugin", async () => {
    const result = await buildTest("* Hello, World!", {
      rehypePlugins: [
        () => (tree) => {
          const visit = (node: typeof tree) => {
            if (node.type === "element" && node.tagName === "h1") {
              node.children = [{ type: "text", value: "Hello, Mock!" }];
            }
            if (node.children) {
              node.children.forEach(visit);
            }
          };
          visit(tree);
        },
      ],
    });
    expect(result.toString()).toEqual("<h1>Hello, Mock!</h1>");
  });

  it("should apply rehype plugin with options", async () => {
    const result = await buildTest("* Hello, World!", {
      rehypePlugins: [
        [
          (options: { text: string }) => (tree) => {
            const visit = (node: typeof tree) => {
              if (node.type === "element" && node.tagName === "h1") {
                node.children = [{ type: "text", value: options.text }];
              }
              if (node.children) {
                node.children.forEach(visit);
              }
            };
            visit(tree);
          },
          { text: "optionsMock" },
        ],
      ],
    });
    expect(result.toString()).toEqual("<h1>optionsMock</h1>");
  });
});
