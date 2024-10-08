/* SPDX-License-Identifier: AGPL-3.0-or-later */

import {
  Loader,
  Writer,
  ModuleResolver,
  FileConverter,
  ContentConverter,
  ContentValidator,
  DocubeError,
  transformerMain,
  MainProcessor,
} from "docube";
import { Effect, identity, Layer } from "effect";
import { glob } from "glob";
import fs from "node:fs/promises";
import camelCase from "camelcase";
import path from "node:path";

import { Config, type InternalConverterOutput } from "./config";

export type TransformerDependencies = {
  readonly loader: Layer.Layer<Loader, DocubeError>;
  readonly fileConverter: Layer.Layer<FileConverter, DocubeError>;
  readonly moduleResolver?: Layer.Layer<ModuleResolver, DocubeError>;
  readonly writer?: Layer.Layer<Writer, DocubeError>;
};

export function makeTransformer(deps: TransformerDependencies) {
  const { loader, fileConverter, moduleResolver, writer = WriterLive } = deps;

  return transformerMain.pipe(
    Effect.provide(loader),
    Effect.provide(
      MainProcessorLive.pipe(
        Layer.provide(fileConverter),
        Layer.provide(writer),
      ),
    ),
    moduleResolver ? Effect.provide(moduleResolver) : identity,
  );
}

export const MainProcessorLive = Layer.effect(
  MainProcessor,
  Effect.gen(function* () {
    const fileConverter = yield* FileConverter;
    const writer = yield* Writer;

    return {
      process: (file) =>
        Effect.gen(function* () {
          const converted = yield* fileConverter.convert(file);
          yield* writer.write(converted);
        }),
    };
  }),
);

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
              text: Effect.tryPromise({
                try: () =>
                  fs
                    .readFile(fileName, { encoding: "utf-8" })
                    .then((buf) => buf.toString()),
                catch: (error) =>
                  new DocubeError({ message: `LoadError: ${error}` }),
              }),
            }),
          ),
        );
      }),
    };
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

        yield* Effect.tryPromise({
          try: () => fs.writeFile(targetPath, text, { encoding: "utf-8" }),
          catch: (error) =>
            new DocubeError({ message: `Write error: ${error}` }),
        });
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
            unsafePreValidation,
            unsafePostContentConversion,
          } = yield* config.getConfig;
          const baseName = path.basename(
            file._meta.fileName,
            path.extname(file._meta.fileName),
          );
          let converted = yield* contentConverter.convert(file);
          if (unsafePreValidation) {
            converted = unsafePreValidation(converted, file);
          }
          const validated = yield* validator.validate(converted);

          return {
            _meta: {
              fileName: `${baseName}.json`,
              directory: path.join(baseDir, moduleName),
            },
            text: Effect.succeed(
              unsafePostContentConversion
                ? unsafePostContentConversion(
                    validated as InternalConverterOutput,
                  )
                : JSON.stringify(validated, null, 2),
            ),
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
          const { decode } = yield* config.getConfig;
          return yield* decode(content as InternalConverterOutput);
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
            output: { baseDir, moduleName, variableName },
            typeStr,
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

          const dtsPath = path.join(baseDir, "index.d.ts");
          yield* Effect.promise(() =>
            fs.appendFile(dtsPath, typeStr, { encoding: "utf-8" }),
          );
        }),
    };
  }),
);

export {
  Config,
  type UserConfig,
  type AppConfig,
  makeAppConfig,
  type InternalConverterOutput,
} from "./config";
export { NameNormalizationLive, makeOutputMeta } from "./utils";
