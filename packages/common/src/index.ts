/* SPDX-License-Identifier: AGPL-3.0-or-later */

import {
  Loader,
  Config,
  NameNormalization,
  Writer,
  ModuleResolver,
  FileConverter,
  ContentConverter,
  ContentValidator,
  type UserConfig,
  DocubeError,
} from "docube";
import { Effect, Layer } from "effect";
import { glob } from "glob";
import fs from "node:fs/promises";
import camelCase from "camelcase";
import pluralize from "pluralize-esm";
import path from "node:path";
import { AST, Schema } from "@effect/schema";

export type TransformerDependencies = {
  loader: Layer.Layer<Loader, DocubeError>;
  fileConverter: Layer.Layer<FileConverter, DocubeError>;
  moduleResolver: Layer.Layer<ModuleResolver, DocubeError>;
  writer: Layer.Layer<Writer, DocubeError>;
};

export function makeTransformer(deps: TransformerDependencies) {
  const { loader, fileConverter, moduleResolver, writer } = deps;

  return transformerMain.pipe(
    Effect.provide(loader),
    Effect.provide(fileConverter),
    Effect.provide(moduleResolver),
    Effect.provide(writer),
  );
}

export const transformerMain = Effect.gen(function* () {
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

export function makeAppConfig(config: UserConfig) {
  return Layer.effect(
    Config,
    Effect.gen(function* () {
      const { output = {} } = config;
      const nameNormalization = yield* NameNormalization;
      const normalizedName = yield* nameNormalization.normalize(config.name);
      const newOutput = {
        baseDir: output.baseDir ?? ".docube/generated",
        typeName: output.typeName ?? normalizedName.typeName,
        moduleName: output.moduleName ?? normalizedName.moduleName,
        variableName: output.variableName ?? normalizedName.variableName,
      };
      return {
        getConfig: Effect.succeed({ ...config, output: newOutput }),
      };
    }),
  ).pipe(Layer.provide(NameNormalizationLive));
}

export const LoaderLive = Layer.effect(
  Loader,
  Effect.gen(function* () {
    const config = yield* Config;
    return {
      load: Effect.gen(function* () {
        const { directory, include, exclude } = yield* config.getConfig;
        const fileNames = yield* Effect.promise(() =>
          glob(include, { cwd: directory, ignore: exclude, absolute: true }),
        );
        return yield* Effect.all(
          fileNames.map((fileName) =>
            Effect.succeed({
              _meta: {
                fileName,
                directory,
              },
              text: Effect.promise(() =>
                fs.readFile(fileName).then((buf) => buf.toString()),
              ),
            }),
          ),
        );
      }),
    };
  }),
);

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

export const WriterLive = Layer.succeed(
  Writer,
  Writer.of({
    write: (file) =>
      Effect.gen(function* () {
        const {
          _meta: { fileName, directory },
        } = file;
        const targetPath = path.join(directory, fileName);
        const text = yield* file.text;

        yield* Effect.promise(() =>
          fs.writeFile(targetPath, text, { encoding: "utf-8" }),
        );
      }),
  }),
);

export const FileConverterLive = Layer.effect(
  FileConverter,
  Effect.gen(function* () {
    const config = yield* Config;
    const contentConverter = yield* ContentConverter;
    const validator = yield* ContentValidator;

    return {
      convert: (file) =>
        Effect.gen(function* () {
          const {
            output: { baseDir, moduleName },
          } = yield* config.getConfig;
          const baseName = path.basename(
            file._meta.fileName,
            path.extname(file._meta.fileName),
          );
          const converted = yield* contentConverter.convert(file);
          const validated = yield* validator.validate(converted);

          return {
            _meta: {
              fileName: `${baseName}.json`,
              directory: path.join(baseDir, moduleName),
            },
            text: Effect.succeed(JSON.stringify(validated, null, 2)),
          };
        }),
    };
  }),
);

export const ContentValidatorLive = Layer.effect(
  ContentValidator,
  Effect.gen(function* () {
    const config = yield* Config;
    return {
      validate: (content) =>
        Effect.gen(function* () {
          const { fields } = yield* config.getConfig;
          const userFields = fields(Schema);
          const schema = Schema.Struct({
            ...userFields,
            body: Schema.String,
            _meta: Schema.Struct({
              fileName: Schema.String,
              directory: Schema.String,
            }),
          });
          const result = yield* Effect.promise(() =>
            Schema.decodeUnknownPromise(schema)(content),
          );
          return result;
        }),
    };
  }),
);

export const ModuleResolverLive = Layer.effect(
  ModuleResolver,
  Effect.gen(function* () {
    const config = yield* Config;
    return {
      resolve: (files) =>
        Effect.gen(function* () {
          const {
            output: { baseDir, moduleName, typeName, variableName },
            fields,
          } = yield* config.getConfig;
          const outputDir = path.join(baseDir, moduleName);
          yield* Effect.promise(() => fs.mkdir(outputDir, { recursive: true }));

          const baseNames = files.map((file) => {
            const extName = path.extname(file._meta.fileName);
            return path.basename(file._meta.fileName, extName);
          });

          const imports = baseNames
            .map((baseName) => {
              return `import ${camelCase(baseName)} from './${baseName}.json' with { type: 'json' }`;
            })
            .join("\n");
          const identifiers = baseNames.map((baseName) => camelCase(baseName));
          const exportLine = `export const ${variableName} = [${identifiers.join(",")}]`;
          const script = `${imports}\n\n${exportLine}`;
          yield* Effect.promise(() =>
            fs.writeFile(path.join(outputDir, "index.mjs"), script, {
              encoding: "utf-8",
            }),
          );
          const parent = path.join(baseDir, "index.mjs");
          const parentExport = `\nexport { ${variableName} } from './${moduleName}'`;
          yield* Effect.promise(() =>
            fs.appendFile(parent, parentExport, { encoding: "utf-8" }),
          );

          const userFields = fields(Schema);
          const schema = Schema.Struct({
            ...userFields,
            body: Schema.String,
            _meta: Schema.Struct({
              fileName: Schema.String,
              directory: Schema.String,
            }),
          });
          const dtsPath = path.join(baseDir, "index.d.ts");
          const defineStatement = `\ntype ${typeName} = ${AST.encodedAST(schema.ast).toString()}\nexport declare const ${variableName}: ${typeName}[]`;
          yield* Effect.promise(() =>
            fs.appendFile(dtsPath, defineStatement, { encoding: "utf-8" }),
          );
        }),
    };
  }),
);
