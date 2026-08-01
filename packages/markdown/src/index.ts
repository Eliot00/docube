import {
	ContentValidatorLive,
	FileConverterLive,
	LoaderLive,
	makeAppConfig,
	makeOutputMeta,
	makeTransformer,
	ModuleResolverLive,
	type UserConfig,
} from "@docube/common";
import { ContentConverter } from "docube";
import { Layer, Effect, type Schema } from "effect";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified, type Pluggable } from "unified";
import { matter } from "vfile-matter";

type Options = {
	readonly allowDangerousHtml?: boolean;
	readonly remarkPlugins?: Pluggable[];
	readonly rehypePlugins?: Pluggable[];
};

export function makeMarkdownConverter(
	options: Options,
): Layer.Layer<ContentConverter, never, never> {
	return Layer.succeed(
		ContentConverter,
		ContentConverter.of({
			convert: (file) =>
				Effect.gen(function* () {
					const builder = unified()
						.use(remarkParse)
						.use(remarkFrontmatter)
						.use(() => {
							return function (_, file) {
								matter(file, { strip: true });
							};
						});
					if (options.remarkPlugins) {
						builder.use(options.remarkPlugins);
					}

					builder.use(remarkRehype, {
						allowDangerousHtml: options.allowDangerousHtml,
					});
					if (options.allowDangerousHtml) {
						builder.use(rehypeRaw);
					}

					if (options.rehypePlugins) {
						builder.use(options.rehypePlugins);
					}

					const content = yield* file.text;
					const html = yield* Effect.promise(() => builder.use(rehypeStringify).process(content));

					const frontMatterData = html.data.matter || {};

					return {
						...frontMatterData,
						_meta: makeOutputMeta(file),
						body: html.toString(),
					};
				}),
		}),
	);
}

export type TransformOptions<F extends Schema.Struct.Fields> = UserConfig<F> & Options;

export function transform<F extends Schema.Struct.Fields>(
	options: TransformOptions<F>,
): Promise<void> {
	const AppConfigLive = makeAppConfig(options);
	const ContentConverterLive = makeMarkdownConverter(options);

	const transformer = makeTransformer({
		loader: LoaderLive.pipe(Layer.provide(AppConfigLive)),
		fileConverter: FileConverterLive.pipe(
			Layer.provide(AppConfigLive),
			Layer.provide(ContentValidatorLive.pipe(Layer.provide(AppConfigLive))),
			Layer.provide(ContentConverterLive),
		),
		moduleResolver: ModuleResolverLive.pipe(Layer.provide(AppConfigLive)),
	});

	return Effect.runPromise(transformer);
}
