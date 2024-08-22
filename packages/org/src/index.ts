/* SPDX-License-Identifier: AGPL-3.0-or-later */

import {
  type UserConfig,
  Loader,
  Writer,
  ModuleResolver,
  FileConverter,
} from "docube";
import { Layer, Effect } from "effect";
import { type Pluggable } from "unified";
import {
  makeAppConfig,
  LoaderLive,
  WriterLive,
  ModuleResolverLive,
  FileConverterLive,
  ContentValidatorLive,
} from "@docube/common";

import { makeUnifiedLive } from "./unified";
import { ContentConverterLive } from "./content";

export type TransformOptions = UserConfig & {
  readonly rehypePlugins?: Pluggable[];
};

export function makeTransformer(options: TransformOptions) {
  const runable = Effect.gen(function* () {
    const loader = yield* Loader;
    const fileConverter = yield* FileConverter;
    const writer = yield* Writer;
    const moduleResolver = yield* ModuleResolver;

    const files = yield* loader.load;

    yield* moduleResolver.resolve(files);

    yield* Effect.all(
      files.map((file) =>
        Effect.gen(function* () {
          const converted = yield* fileConverter.convert(file);
          yield* writer.write(converted);
        }),
      ),
    );
  });

  const AppConfigLive = makeAppConfig(options);
  const UnifiedLive = makeUnifiedLive({ rehypePlugins: options.rehypePlugins });

  return runable.pipe(
    Effect.provide(LoaderLive.pipe(Layer.provide(AppConfigLive))),
    Effect.provide(
      FileConverterLive.pipe(
        Layer.provide(AppConfigLive),
        Layer.provide(ContentValidatorLive.pipe(Layer.provide(AppConfigLive))),
        Layer.provide(ContentConverterLive.pipe(Layer.provide(UnifiedLive))),
      ),
    ),
    Effect.provide(WriterLive.pipe(Layer.provide(AppConfigLive))),
    Effect.provide(ModuleResolverLive.pipe(Layer.provide(AppConfigLive))),
  );
}

export function transform(options: TransformOptions) {
  const transfomer = makeTransformer(options);
  Effect.runPromiseExit(transfomer).then(console.log, console.error);
}

export { makeUnifiedLive };
