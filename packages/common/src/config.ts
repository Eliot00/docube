/* SPDX-License-Identifier: AGPL-3.0-or-later */

import { Context, Layer, Effect } from "effect";
import { AST, Schema } from "@effect/schema";
import {
  NameNormalization,
  type NormalizedName,
  type FileLike,
  DocubeError,
} from "docube";

import { NameNormalizationLive, type OutputMeta } from "./utils";

type SchemaModuleType = typeof Schema;

type BaseConfig = {
  readonly name: string;
  readonly directory: string;
  readonly include: string;
  readonly exclude?: string;
  readonly unsafePreValidation?: (
    converted: unknown,
    source: FileLike,
  ) => unknown;
};

export type AppConfig = {
  readonly output: {
    baseDir: string;
  } & NormalizedName;
  readonly decode: (
    raw: InternalConverterOutput,
  ) => Effect.Effect<InternalConverterOutput, DocubeError>;
  readonly typeStr: string;
  readonly unsafePostContentConversion?: (
    raw: InternalConverterOutput,
  ) => string;
} & BaseConfig;

export type InternalConverterOutput = {
  readonly body: string;
  readonly _meta: OutputMeta;
} & {
  [key: string]: unknown;
};

export interface UserConfig<in out F extends Schema.Struct.Fields>
  extends BaseConfig {
  readonly output?: Partial<AppConfig["output"]>;
  readonly fields: (s: SchemaModuleType) => F;
  readonly unsafePostContentConversion?: (
    raw: Schema.Struct.Type<F> & InternalConverterOutput,
  ) => string;
}

export class Config extends Context.Tag("DocubeConfigService")<
  Config,
  { readonly getConfig: Effect.Effect<AppConfig> }
>() {}

export function makeAppConfig<F extends Schema.Struct.Fields>(
  config: UserConfig<F>,
) {
  return Layer.effect(
    Config,
    Effect.gen(function* () {
      const { output = {}, unsafePostContentConversion } = config;
      const nameNormalization = yield* NameNormalization;
      const normalizedName = yield* nameNormalization.normalize(config.name);
      const newOutput = {
        baseDir: output.baseDir ?? ".docube/generated",
        typeName: output.typeName ?? normalizedName.typeName,
        moduleName: output.moduleName ?? normalizedName.moduleName,
        variableName: output.variableName ?? normalizedName.variableName,
      };

      const schema = makeInternalSchema(config);

      // TODO: don't know why
      const decode = (raw: InternalConverterOutput) =>
        Effect.succeed(
          Schema.decodeUnknownSync<
            InternalConverterOutput,
            InternalConverterOutput
          >(schema as any)(raw), // eslint-disable-line
        );

      const typeStr = `\ntype ${newOutput.typeName} = ${AST.encodedAST(schema.ast).toString()}\nexport declare const ${newOutput.variableName}: ${newOutput.typeName}[]`;
      return {
        getConfig: Effect.succeed({
          ...config,
          output: newOutput,
          decode,
          typeStr,
          unsafePostContentConversion: unsafePostContentConversion as (
            raw: unknown,
          ) => string,
        }),
      };
    }),
  ).pipe(Layer.provide(NameNormalizationLive));
}

export function makeInternalSchema<F extends Schema.Struct.Fields>(
  config: UserConfig<F>,
) {
  const { fields } = config;
  const userFields = fields(Schema);
  return Schema.Struct({
    ...userFields,
    body: Schema.String,
    _meta: Schema.Struct({
      sourceFileName: Schema.String,
      sourceDirectory: Schema.String,
      sourceFileType: Schema.String,
      slug: Schema.String,
    }),
  });
}
