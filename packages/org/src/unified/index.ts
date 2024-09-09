import { unified, type Pluggable } from "unified";
import parse from "uniorg-parse";
import uniorg2rehype from "uniorg-rehype";
import stringify from "rehype-stringify";
import extractKeywords from "uniorg-extract-keywords";
import { Effect, Layer } from "effect";
import { Unified } from "docube";

export type Options = {
  rehypePlugins?: Pluggable[];
};

export function makeUnifiedLive(options?: Options) {
  const processor = unified()
    .use(parse)
    .use(extractKeywords)
    .use(uniorg2rehype)
    .use(options?.rehypePlugins || [])
    .use(stringify);

  return Layer.succeed(
    Unified,
    Unified.of({
      process(content) {
        return Effect.promise(() => processor.process(content));
      },
    }),
  );
}
