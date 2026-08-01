/* SPDX-License-Identifier: AGPL-3.0-or-later */

import {
	ContentValidatorLive,
	FileConverterLive,
	LoaderLive,
	makeAppConfig,
	ModuleResolverLive,
	makeTransformer,
	WriterLive,
	type UserConfig,
	makeOutputMeta,
} from "@docube/common";
import { ContentConverter } from "docube";
import { Effect, Layer, type Schema } from "effect";
import { bundleMDX } from "mdx-bundler";
import type { Pluggable } from "unified";

type MdxBundleOptions = {
	readonly remarkPlugins?: Pluggable[];
	readonly rehypePlugins?: Pluggable[];
};

export function makeMdxConverter(
	options: MdxBundleOptions,
): Layer.Layer<ContentConverter, never, never> {
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
						_meta: makeOutputMeta(file),
						body: code,
					};
				}),
		}),
	);
	return converter;
}

export type TransformOptions<F extends Schema.Struct.Fields> = UserConfig<F> & MdxBundleOptions;

export function transform<F extends Schema.Struct.Fields>(
	options: TransformOptions<F>,
): Promise<void> {
	const AppConfigLive = makeAppConfig(options);
	const ContentConverterLive = makeMdxConverter(options);

	const transformer = makeTransformer({
		loader: LoaderLive.pipe(Layer.provide(AppConfigLive)),
		fileConverter: FileConverterLive.pipe(
			Layer.provide(AppConfigLive),
			Layer.provide(ContentValidatorLive.pipe(Layer.provide(AppConfigLive))),
			Layer.provide(ContentConverterLive),
		),
		writer: WriterLive,
		moduleResolver: ModuleResolverLive.pipe(Layer.provide(AppConfigLive)),
	});

	return Effect.runPromise(transformer);
}
