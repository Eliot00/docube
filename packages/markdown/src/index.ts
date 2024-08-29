import { ContentConverter } from "docube";
import { Layer, Effect, Option } from "effect";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import { unified, type Pluggable } from "unified";
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
import type { JsonValue } from "@effect/schema/FastCheck";
import type * as Schema from "@effect/schema/Schema";

type Options = {
  readonly frontMatterExtractor?: (content: string) => {
    [key in string]?: JsonValue;
  };
  readonly allowDangerousHtml?: boolean;
  readonly remarkPlugins?: Pluggable[];
  readonly rehypePlugins?: Pluggable[];
};

export function makeMarkdownConverter(options: Options) {
  return Layer.succeed(
    ContentConverter,
    ContentConverter.of({
      convert: (file) =>
        Effect.gen(function* () {
          const builder = unified().use(remarkParse);
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
          const html = yield* Effect.promise(() =>
            builder.use(rehypeStringify).process(content),
          );

          let frontMatterData = {};
          if (options.frontMatterExtractor) {
            frontMatterData = options.frontMatterExtractor(content);
          } else {
            const maybeMatter = yield* Effect.promise(
              () => import("gray-matter"),
            ).pipe(Effect.option);
            if (Option.isSome(maybeMatter)) {
              frontMatterData = maybeMatter.value.default(content).data;
            }
          }

          return {
            ...frontMatterData,
            _meta: makeOutputMeta(file),
            body: html.toString(),
          };
        }),
    }),
  );
}

export type TransformOptions<F extends Schema.Struct.Fields> = UserConfig<F> &
  Options;

export function transform<F extends Schema.Struct.Fields>(
  options: TransformOptions<F>,
) {
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

  Effect.runPromiseExit(transformer).then(console.log, console.error);
}
