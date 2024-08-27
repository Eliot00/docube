/* SPDX-License-Identifier: AGPL-3.0-or-later */

import { Effect, Layer } from "effect";
import { NameNormalization, type FileLike } from "docube";
import camelCase from "camelcase";
import pluralize from "pluralize-esm";
import slugify from "slugify";
import path from "node:path";

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

export type OutputMeta = {
  readonly sourceFileName: string;
  readonly sourceDirectory: string;
  readonly sourceFileType: string;
  readonly slug: string;
};

export function makeOutputMeta(file: FileLike): OutputMeta {
  const extName = path.extname(file._meta.fileName);
  const baseName = path.basename(file._meta.fileName, extName);
  const sourceFileType =
    extName.substring(extName.lastIndexOf(".") + 1) || "unknown";

  return {
    sourceFileName: file._meta.fileName,
    sourceDirectory: file._meta.directory,
    sourceFileType,
    slug: slugify(baseName, { lower: true }),
  };
}
