/* SPDX-License-Identifier: AGPL-3.0-or-later */

import { NameNormalization, type NormalizedName, type FileLike, DocubeError } from "docube";
import { Context, Layer, Effect } from "effect";
import { Schema, SchemaAST } from "effect";

import { NameNormalizationLive, type OutputMeta } from "./utils";

type SchemaModuleType = typeof Schema;

type BaseConfig = {
	readonly name: string;
	readonly directory: string;
	readonly include: string;
	readonly exclude?: string;
	/**
	 * Transform the converted content before it is validated against the schema.
	 *
	 * Runs after the format-specific converter produces `{ frontmatter..., _meta, body }`
	 * and before schema validation. Use it to rename frontmatter keys, coerce types,
	 * or normalize values — e.g. splitting an org `#+TAGS: one two` string into an array.
	 */
	readonly contentTransform?: (
		converted: InternalConverterOutput,
		source: FileLike,
	) => InternalConverterOutput;
	/** @deprecated Use `contentTransform` instead. */
	readonly unsafePreValidation?: (converted: unknown, source: FileLike) => unknown;
};

export type AppConfig = {
	readonly output: {
		baseDir: string;
	} & NormalizedName;
	readonly decode: (
		raw: InternalConverterOutput,
	) => Effect.Effect<InternalConverterOutput, DocubeError>;
	readonly typeStr: string;
	readonly unsafePostContentConversion?: (raw: InternalConverterOutput) => string;
} & BaseConfig;

export type InternalConverterOutput = {
	readonly body: string;
	readonly _meta: OutputMeta;
} & {
	[key: string]: unknown;
};

export interface UserConfig<in out F extends Schema.Struct.Fields> extends BaseConfig {
	readonly output?: Partial<AppConfig["output"]>;
	readonly fields: (s: SchemaModuleType) => F;
	readonly unsafePostContentConversion?: (
		raw: Schema.Struct.Type<F> & InternalConverterOutput,
	) => string;
}

const ConfigBase: Context.TagClass<
	Config,
	"DocubeConfigService",
	{
		readonly getConfig: Effect.Effect<AppConfig>;
	}
> = Context.Tag("DocubeConfigService")<Config, { readonly getConfig: Effect.Effect<AppConfig> }>();
export class Config extends ConfigBase {}

export function makeAppConfig<F extends Schema.Struct.Fields>(
	config: UserConfig<F>,
): Layer.Layer<Config> {
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
					Schema.decodeUnknownSync<InternalConverterOutput, InternalConverterOutput>(schema as any)(
						raw,
					), // eslint-disable-line
				);

			const typeStr = `\ntype ${newOutput.typeName} = ${SchemaAST.encodedAST(
				schema.ast,
			).toString()}\nexport declare const ${newOutput.variableName}: ${newOutput.typeName}[]`;
			return {
				getConfig: Effect.succeed({
					...config,
					output: newOutput,
					decode,
					typeStr,
					unsafePostContentConversion: unsafePostContentConversion as (raw: unknown) => string,
				}),
			};
		}),
	).pipe(Layer.provide(NameNormalizationLive));
}

export function makeInternalSchema<F extends Schema.Struct.Fields>(
	config: UserConfig<F>,
): Schema.Struct<
	F & {
		body: typeof Schema.String;
		_meta: Schema.Struct<{
			sourceFileName: typeof Schema.String;
			sourceDirectory: typeof Schema.String;
			sourceFileType: typeof Schema.String;
			slug: typeof Schema.String;
		}>;
	}
> {
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
