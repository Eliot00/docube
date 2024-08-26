/* SPDX-License-Identifier: AGPL-3.0-or-later */

import { Context } from "effect";
import type * as Effect from "effect/Effect";
import type * as Schema from "@effect/schema/Schema";
import type { NormalizedName } from "docube";

type SchemaModuleType = typeof Schema;

type BaseConfig = {
  readonly name: string;
  readonly directory: string;
  readonly include: string;
  readonly exclude?: string;
  readonly fields: (s: SchemaModuleType) => Schema.Struct.Fields;
};

export type AppConfig = {
  readonly output: {
    baseDir: string;
  } & NormalizedName;
} & BaseConfig;

export type UserConfig = {
  readonly output?: Partial<AppConfig["output"]>;
} & BaseConfig;

export class Config extends Context.Tag("DocubeConfigService")<
  Config,
  { readonly getConfig: Effect.Effect<AppConfig> }
>() {}
