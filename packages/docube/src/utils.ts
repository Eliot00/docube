/* SPDX-License-Identifier: AGPL-3.0-or-later */

import { Context, Effect } from "effect";
import type { VFile } from "vfile";
import { Schema } from "@effect/schema";

import { DocubeError } from "./error";
import type { FileLike } from "./io";

export class Unified extends Context.Tag("DocubeUnifiedService")<
  Unified,
  { readonly process: (content: string) => Effect.Effect<VFile, DocubeError> }
>() {}

export type NormalizedName = {
  typeName: string;
  moduleName: string;
  variableName: string;
};

export class NameNormalization extends Context.Tag(
  "DocubeNameNormalizationService",
)<
  NameNormalization,
  { readonly normalize: (name: string) => Effect.Effect<NormalizedName> }
>() {}

export class ModuleResolver extends Context.Tag("DocubeModuleResolverService")<
  ModuleResolver,
  { readonly resolve: (files: FileLike[]) => Effect.Effect<void, DocubeError> }
>() {}

export class FileConverter extends Context.Tag("DocubeFileConverterService")<
  FileConverter,
  { readonly convert: (file: FileLike) => Effect.Effect<FileLike, DocubeError> }
>() {}

export class ContentConverter extends Context.Tag(
  "DocubeContentConverterService",
)<
  ContentConverter,
  { readonly convert: (file: FileLike) => Effect.Effect<unknown, DocubeError> }
>() {}

export class ContentValidator extends Context.Tag(
  "DocubeContentValidatorService",
)<
  ContentValidator,
  {
    readonly validate: (
      content: unknown,
    ) => Effect.Effect<unknown, DocubeError>;
  }
>() {}
