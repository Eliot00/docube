/* SPDX-License-Identifier: AGPL-3.0-or-later */

import { Context, Data, Effect } from "effect";
import type { VFile } from "vfile";

export class ResourceDefinition extends Context.Tag(
  "DocubeResourceDefinitionService",
)<
  ResourceDefinition,
  {
    readonly define: Effect.Effect<{
      readonly cwd: string;
      readonly globPattern: string;
    }>;
  }
>() {}

export type FileLike = {
  readonly path: string;
  text(): Promise<string>;
};

export class DocubeError extends Data.TaggedError("Docube")<{
  message: string;
}> {}

export class Resource extends Context.Tag("DocubeResourceService")<
  Resource,
  { readonly load: Effect.Effect<FileLike[], DocubeError> }
>() {}

export class Transformer extends Context.Tag("DocubeTransformerService")<
  Transformer,
  { readonly transform: Effect.Effect<void, DocubeError> }
>() {}

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
