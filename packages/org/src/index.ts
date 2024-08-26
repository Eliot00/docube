/* SPDX-License-Identifier: AGPL-3.0-or-later */

import { Layer, Effect } from "effect";
import { type Pluggable } from "unified";
import {
  makeAppConfig,
  makeTransformer,
  LoaderLive,
  WriterLive,
  ModuleResolverLive,
  FileConverterLive,
  ContentValidatorLive,
  type UserConfig,
} from "@docube/common";
import type * as Schema from "@effect/schema/Schema";

import { makeUnifiedLive } from "./unified";
import { ContentConverterLive } from "./content";

export type TransformOptions<F extends Schema.Struct.Fields> = UserConfig<F> & {
  readonly rehypePlugins?: Pluggable[];
};

export function transform<F extends Schema.Struct.Fields>(
  options: TransformOptions<F>,
) {
  const AppConfigLive = makeAppConfig(options);
  const UnifiedLive = makeUnifiedLive({ rehypePlugins: options.rehypePlugins });

  const transformer = makeTransformer({
    loader: LoaderLive.pipe(Layer.provide(AppConfigLive)),
    fileConverter: FileConverterLive.pipe(
      Layer.provide(AppConfigLive),
      Layer.provide(ContentValidatorLive.pipe(Layer.provide(AppConfigLive))),
      Layer.provide(ContentConverterLive.pipe(Layer.provide(UnifiedLive))),
    ),
    moduleResolver: ModuleResolverLive.pipe(Layer.provide(AppConfigLive)),
    writer: WriterLive.pipe(Layer.provide(AppConfigLive)),
  });
  Effect.runPromiseExit(transformer).then(console.log, console.error);
}

export { makeUnifiedLive };
