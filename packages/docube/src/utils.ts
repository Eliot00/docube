/* SPDX-License-Identifier: AGPL-3.0-or-later */

import { Context, Effect } from "effect";
import type { VFile } from "vfile";

import { DocubeError } from "./error";
import type { FileLike } from "./io";

const UnifiedBase: Context.TagClass<
  Unified,
  "DocubeUnifiedService",
  {
    readonly process: (content: string) => Effect.Effect<VFile, DocubeError>;
  }
> = Context.Tag("DocubeUnifiedService")<
  Unified,
  { readonly process: (content: string) => Effect.Effect<VFile, DocubeError> }
>();
export class Unified extends UnifiedBase {}

export type NormalizedName = {
  typeName: string;
  moduleName: string;
  variableName: string;
};

const NameNormalizationBase: Context.TagClass<
  NameNormalization,
  "DocubeNameNormalizationService",
  {
    readonly normalize: (name: string) => Effect.Effect<NormalizedName>;
  }
> = Context.Tag("DocubeNameNormalizationService")<
  NameNormalization,
  { readonly normalize: (name: string) => Effect.Effect<NormalizedName> }
>();
export class NameNormalization extends NameNormalizationBase {}

const ModuleResolverBase: Context.TagClass<
  ModuleResolver,
  "DocubeModuleResolverService",
  {
    readonly resolve: (files: FileLike[]) => Effect.Effect<void, DocubeError>;
  }
> = Context.Tag("DocubeModuleResolverService")<
  ModuleResolver,
  { readonly resolve: (files: FileLike[]) => Effect.Effect<void, DocubeError> }
>();
export class ModuleResolver extends ModuleResolverBase {}

const FileConverterBase: Context.TagClass<
  FileConverter,
  "DocubeFileConverterService",
  {
    readonly convert: (file: FileLike) => Effect.Effect<FileLike, DocubeError>;
  }
> = Context.Tag("DocubeFileConverterService")<
  FileConverter,
  { readonly convert: (file: FileLike) => Effect.Effect<FileLike, DocubeError> }
>();
export class FileConverter extends FileConverterBase {}

const ContentConverterBase: Context.TagClass<
  ContentConverter,
  "DocubeContentConverterService",
  {
    readonly convert: (file: FileLike) => Effect.Effect<unknown, DocubeError>;
  }
> = Context.Tag("DocubeContentConverterService")<
  ContentConverter,
  { readonly convert: (file: FileLike) => Effect.Effect<unknown, DocubeError> }
>();
export class ContentConverter extends ContentConverterBase {}

const ContentValidatorBase: Context.TagClass<
  ContentValidator,
  "DocubeContentValidatorService",
  {
    readonly validate: (
      content: unknown,
    ) => Effect.Effect<unknown, DocubeError>;
  }
> = Context.Tag("DocubeContentValidatorService")<
  ContentValidator,
  {
    readonly validate: (
      content: unknown,
    ) => Effect.Effect<unknown, DocubeError>;
  }
>();
export class ContentValidator extends ContentValidatorBase {}
