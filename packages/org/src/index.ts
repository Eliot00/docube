/* SPDX-License-Identifier: AGPL-3.0-or-later */

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
import { Layer, Effect, type Schema } from "effect";
import { type Pluggable } from "unified";

import { ContentConverterLive } from "./content";
import { makeUnifiedLive } from "./unified";

export type TransformOptions<F extends Schema.Struct.Fields> = UserConfig<F> & {
	readonly rehypePlugins?: Pluggable[];
};

export function transform<F extends Schema.Struct.Fields>(
	options: TransformOptions<F>,
): Promise<void> {
	const AppConfigLive = makeAppConfig(options);
	const UnifiedLive = makeUnifiedLive(options);

	const transformer = makeTransformer({
		loader: LoaderLive.pipe(Layer.provide(AppConfigLive)),
		fileConverter: FileConverterLive.pipe(
			Layer.provide(AppConfigLive),
			Layer.provide(ContentValidatorLive.pipe(Layer.provide(AppConfigLive))),
			Layer.provide(ContentConverterLive.pipe(Layer.provide(UnifiedLive))),
		),
		moduleResolver: ModuleResolverLive.pipe(Layer.provide(AppConfigLive)),
		writer: WriterLive,
	});
	return Effect.runPromise(transformer);
}

export { makeUnifiedLive };
