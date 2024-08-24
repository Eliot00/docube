/* SPDX-License-Identifier: AGPL-3.0-or-later */

import { type UserConfig } from "docube";
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
} from "@docube/common";

import { makeUnifiedLive } from "./unified";
import { ContentConverterLive } from "./content";

export type TransformOptions = UserConfig & {
  readonly rehypePlugins?: Pluggable[];
};

export function transform(options: TransformOptions) {
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
