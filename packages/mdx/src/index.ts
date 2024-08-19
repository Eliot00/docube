/* SPDX-License-Identifier: AGPL-3.0-or-later */

import { glob } from "glob";
import fs from "node:fs/promises";
import path from "node:path";
import type { Pluggable } from "unified";
import camelCase from "camelcase";
import pluralize from "pluralize-esm";
import { bundleMDX } from "mdx-bundler";
import { Schema, AST } from "@effect/schema";
import { Effect, Layer, Either } from "effect";
import { Resource, Transformer, NameNormalization, DocubeError } from "docube";

export const NameNormalizationLive = Layer.succeed(
  NameNormalization,
  NameNormalization.of({
    normalize: (name) => {
      const capital = camelCase(name, { pascalCase: true });
      const camel = camelCase(name);
      return Effect.succeed({
        typeName: capital,
        moduleName: pluralize(camel),
        variableName: `all${pluralize(capital)}`,
      });
    },
  }),
);

export type MakeOptions = {
  readonly name: string;
  readonly directory: string;
  readonly includes: string;
  readonly fields: Schema.Struct.Fields;
  readonly outputBaseDir?: string;
  readonly remarkPlugins?: Pluggable[];
  readonly rehypePlugins?: Pluggable[];
};

export function make(options: MakeOptions) {
  const {
    name,
    directory,
    includes,
    fields,
    outputBaseDir = ".docube/generated",
    remarkPlugins,
    rehypePlugins,
  } = options;

  const ResourceLive = Layer.effect(
    Resource,
    Effect.gen(function* () {
      return {
        load: Effect.gen(function* () {
          const fileNames = yield* Effect.promise(() =>
            glob(includes, { cwd: directory, absolute: true }),
          );
          return yield* Effect.all(
            fileNames.map((fileName) =>
              Effect.succeed({
                path: fileName,
                text: () => fs.readFile(fileName).then((buf) => buf.toString()),
              }),
            ),
          );
        }),
      };
    }),
  );

  const TransformerLive = Layer.effect(
    Transformer,
    Effect.gen(function* () {
      const resource = yield* Resource;
      const nameNormalization = yield* NameNormalization;
      return {
        transform: Effect.gen(function* () {
          const files = yield* resource.load;

          const { moduleName, variableName, typeName } =
            yield* nameNormalization.normalize(name);
          const outputDir = path.join(outputBaseDir, moduleName);
          yield* Effect.promise(() => fs.mkdir(outputDir, { recursive: true }));

          const imports = files
            .map((file) => {
              const extName = path.extname(file.path);
              const baseName = path.basename(file.path, extName);
              return `import ${camelCase(baseName)} from './${baseName}.json' with { type: 'json' }`;
            })
            .join("\n");
          const identifiers = files.map((file) => {
            const extName = path.extname(file.path);
            const baseName = path.basename(file.path, extName);
            return camelCase(baseName);
          });
          const exportLine = `export const ${variableName} = [${identifiers.join(",")}]`;
          const script = `${imports}\n\n${exportLine}`;
          yield* Effect.promise(() =>
            fs.writeFile(path.join(outputDir, "index.mjs"), script, {
              encoding: "utf-8",
            }),
          );

          const parent = path.join(outputBaseDir, "index.mjs");
          const parentExport = `\nexport { ${variableName} } from './${moduleName}'`;
          yield* Effect.promise(() =>
            fs.appendFile(parent, parentExport, { encoding: "utf-8" }),
          );

          const schema = Schema.Struct({
            ...fields,
            body: Schema.String,
            _meta: Schema.Struct({
              path: Schema.String,
              extName: Schema.String,
              baseName: Schema.String,
            }),
          });
          const dtsPath = path.join(outputBaseDir, "index.d.ts");
          const defineStatement = `\ntype ${typeName} = ${AST.encodedAST(schema.ast).toString()}\nexport declare const ${variableName}: ${typeName}[]`;
          yield* Effect.promise(() =>
            fs.appendFile(dtsPath, defineStatement, { encoding: "utf-8" }),
          );

          yield* Effect.all(
            files.map((file) =>
              Effect.gen(function* () {
                const content = yield* Effect.promise(file.text);
                const { code, frontmatter } = yield* Effect.promise(() =>
                  bundleMDX({
                    source: content,
                    mdxOptions(opt) {
                      opt.remarkPlugins = [
                        ...(opt.remarkPlugins ?? []),
                        ...(remarkPlugins ?? []),
                      ];
                      opt.rehypePlugins = [
                        ...(opt.rehypePlugins ?? []),
                        ...(rehypePlugins ?? []),
                      ];
                      return opt;
                    },
                  }),
                );
                const extName = path.extname(file.path);
                const baseName = path.basename(file.path, extName);
                const rawOutput = {
                  ...frontmatter,
                  _meta: {
                    path: file.path,
                    extName,
                    baseName,
                  },
                  body: code,
                };
                const decodeResult =
                  Schema.decodeUnknownEither(schema)(rawOutput);
                if (Either.isLeft(decodeResult)) {
                  yield* new DocubeError({
                    message: decodeResult.left.message,
                  });
                  return;
                }

                const output = decodeResult.right;

                yield* Effect.promise(() =>
                  fs.writeFile(
                    path.join(outputDir, `${baseName}.json`),
                    JSON.stringify(output, null, 2),
                  ),
                );
              }),
            ),
          );
        }),
      };
    }),
  );

  const MainLive = TransformerLive.pipe(
    Layer.provide(ResourceLive),
    Layer.provide(NameNormalizationLive),
  );

  const program = Effect.gen(function* () {
    const transformer = yield* Transformer;
    yield* transformer.transform;
  });

  const runable = Effect.provide(program, MainLive);

  Effect.runPromise(runable).then(console.log, console.error);
}
