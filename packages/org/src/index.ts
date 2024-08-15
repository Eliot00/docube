/* SPDX-License-Identifier: AGPL-3.0-or-later */

import { Resource, Transformer } from "docube";
import { Layer, Effect, Either } from "effect";
import { AST, Schema } from "@effect/schema";
import { glob } from "glob";
import fs from "node:fs/promises";
import path from "node:path";
import { unified } from "unified";
import parse from "uniorg-parse";
import uniorg2rehype from "uniorg-rehype";
import stringify from "rehype-stringify";
import extractKeywords from "uniorg-extract-keywords";
import camelCase from "camelcase";
import pluralize from "pluralize-esm";

const processor = unified()
  .use(parse)
  .use(extractKeywords)
  .use(uniorg2rehype)
  .use(stringify);

const process = (content: string) =>
  Effect.promise(() => processor.process(content));

export type DocumentDefinition = {
  readonly name: string;
  readonly directory: string;
  readonly includes: string;
  readonly fields: Schema.Struct.Fields;
  readonly outputBaseDir?: string;
};

export function make(def: DocumentDefinition) {
  const {
    name,
    directory,
    includes,
    fields,
    outputBaseDir = ".docube/generated",
  } = def;
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
      return {
        transform: Effect.gen(function* () {
          const files = yield* resource.load;

          const camelCaseName = camelCase(name);
          const pluralizedName = pluralize(camelCaseName);
          const outputDir = path.join(outputBaseDir, pluralizedName);
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
          const exportName = camelCase(["all", pluralizedName]);
          const exportLine = `export const ${exportName} = [${identifiers.join(",")}]`;
          const script = `${imports}\n\n${exportLine}`;
          yield* Effect.promise(() =>
            fs.writeFile(path.join(outputDir, "index.mjs"), script, {
              encoding: "utf-8",
            }),
          );

          const parent = path.join(outputBaseDir, "index.mjs");
          const parentExport = `\nexport { ${exportName} } from './${pluralizedName}'`;
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
          const typeName = camelCase(name, { pascalCase: true });
          const defineStatement = `\ntype ${typeName} = ${AST.encodedAST(schema.ast).toString()}\nexport declare const ${exportName}: ${typeName}[]`;
          yield* Effect.promise(() =>
            fs.appendFile(dtsPath, defineStatement, { encoding: "utf-8" }),
          );

          yield* Effect.all(
            files.map((file) =>
              Effect.gen(function* () {
                const content = yield* Effect.promise(file.text);
                const vFile = yield* process(content);
                const extName = path.extname(file.path);
                const baseName = path.basename(file.path, extName);
                const rawOutput = {
                  ...vFile.data,
                  _meta: {
                    path: file.path,
                    extName,
                    baseName,
                  },
                  body: vFile.toString(),
                };
                const decodeResult =
                  Schema.decodeUnknownEither(schema)(rawOutput);
                if (Either.isLeft(decodeResult)) {
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

  const MainLive = TransformerLive.pipe(Layer.provide(ResourceLive));

  const program = Effect.gen(function* () {
    const transformer = yield* Transformer;
    yield* transformer.transform;
  });

  const runable = Effect.provide(program, MainLive);

  Effect.runPromise(runable).then(console.log, console.error);
}
