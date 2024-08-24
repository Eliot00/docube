/* SPDX-License-Identifier: AGPL-3.0-or-later */

import type { Pluggable } from "unified";
import { bundleMDX } from "mdx-bundler";
import { Effect, Layer } from "effect";
import { type UserConfig, ContentConverter } from "docube";
import {
  ContentValidatorLive,
  FileConverterLive,
  LoaderLive,
  makeAppConfig,
  ModuleResolverLive,
  makeTransformer,
  WriterLive,
} from "@docube/common";

type MdxBundleOptions = {
  readonly remarkPlugins?: Pluggable[];
  readonly rehypePlugins?: Pluggable[];
};

export function makeMdxConverter(options: MdxBundleOptions) {
  const converter = Layer.succeed(
    ContentConverter,
    ContentConverter.of({
      convert: (file) =>
        Effect.gen(function* () {
          const source = yield* file.text;
          const { code, frontmatter } = yield* Effect.promise(() =>
            bundleMDX({
              source,
              files: {},
              mdxOptions(opt) {
                opt.remarkPlugins = [
                  ...(opt.remarkPlugins ?? []),
                  ...(options.remarkPlugins ?? []),
                ];
                opt.rehypePlugins = [
                  ...(opt.rehypePlugins ?? []),
                  ...(options.rehypePlugins ?? []),
                ];
                return opt;
              },
              esbuildOptions(options) {
                if (!options.define) {
                  options.define = {};
                }
                const env = process.env.NODE_ENV ?? "production";
                options.define["process.env.NODE_ENV"] = JSON.stringify(env);
                return options;
              },
            }),
          );

          return {
            ...frontmatter,
            _meta: file._meta,
            body: code,
          };
        }),
    }),
  );
  return converter;
}

export type TransformOptions = UserConfig & MdxBundleOptions;

export function transform(options: TransformOptions) {
  const AppConfigLive = makeAppConfig(options);
  const ContentConverterLive = makeMdxConverter(options);

  const transformer = makeTransformer({
    loader: LoaderLive.pipe(Layer.provide(AppConfigLive)),
    fileConverter: FileConverterLive.pipe(
      Layer.provide(AppConfigLive),
      Layer.provide(ContentValidatorLive.pipe(Layer.provide(AppConfigLive))),
      Layer.provide(ContentConverterLive),
    ),
    writer: WriterLive.pipe(Layer.provide(AppConfigLive)),
    moduleResolver: ModuleResolverLive.pipe(Layer.provide(AppConfigLive)),
  });

  Effect.runPromiseExit(transformer).then(console.log, console.error);
}
