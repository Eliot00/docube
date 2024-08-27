import { ContentConverter, Unified } from "docube";
import { Layer, Effect } from "effect";
import { makeOutputMeta } from "@docube/common";

export const ContentConverterLive = Layer.effect(
  ContentConverter,
  Effect.gen(function* () {
    const unified = yield* Unified;
    return {
      convert: (file) =>
        Effect.gen(function* () {
          const parsed = yield* file.text.pipe(Effect.andThen(unified.process));
          return {
            ...parsed.data,
            _meta: makeOutputMeta(file),
            body: parsed.toString(),
          };
        }),
    };
  }),
);
