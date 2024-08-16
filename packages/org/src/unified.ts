import { unified, type Pluggable } from "unified";
import parse from "uniorg-parse";
import uniorg2rehype from "uniorg-rehype";
import stringify from "rehype-stringify";
import extractKeywords from "uniorg-extract-keywords";
import { Effect, Layer } from "effect";
import { Unified } from "docube";

export type Options = {
    rehypePlugins?: Pluggable[]
}

export function makeUnifiedLive(options?: Options) {
    const builder = unified().use(parse).use(extractKeywords).use(uniorg2rehype)
    if (options?.rehypePlugins) {
        builder().use(options.rehypePlugins)
    }

    return Layer.succeed(
        Unified,
        Unified.of({
            process(content) {
                return Effect.promise(() => builder().use(stringify).process(content))
            },
        })
    )
}
