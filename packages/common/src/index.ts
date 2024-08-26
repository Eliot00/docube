/* SPDX-License-Identifier: AGPL-3.0-or-later */

import {
  Loader,
  Writer,
  ModuleResolver,
  FileConverter,
  ContentConverter,
  ContentValidator,
  DocubeError,
} from "docube";
import { Effect, Layer } from "effect";
import { glob } from "glob";
import fs from "node:fs/promises";
import camelCase from "camelcase";
import path from "node:path";

import { Config } from "./config";

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
                ? unsafePostContentConversion(validated)
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
          return yield* decode(content);
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
} from "./config";
export { NameNormalizationLive } from "./utils";
