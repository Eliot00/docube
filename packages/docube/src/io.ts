/* SPDX-License-Identifier: AGPL-3.0-or-later */

import { Context, Effect } from "effect";

import { DocubeError } from "./error";

const LoaderBase: Context.TagClass<
  Loader,
  "DocubeLoaderService",
  {
    readonly load: Effect.Effect<FileLike[], DocubeError>;
  }
> = Context.Tag("DocubeLoaderService")<
  Loader,
  { readonly load: Effect.Effect<FileLike[], DocubeError> }
>();
export class Loader extends LoaderBase {}

export type FileLike = {
  readonly _meta: FileMeta;
  readonly text: Effect.Effect<string, DocubeError>;
};

export type FileMeta = {
  readonly fileName: string;
  readonly directory: string;
};

const WriterBase: Context.TagClass<
  Writer,
  "DocubeWriterService",
  {
    readonly write: (file: FileLike) => Effect.Effect<void, DocubeError>;
  }
> = Context.Tag("DocubeWriterService")<
  Writer,
  {
    readonly write: (file: FileLike) => Effect.Effect<void, DocubeError>;
  }
>();
export class Writer extends WriterBase {}

const SkipCheckerBase: Context.TagClass<
  SkipChecker,
  "SkipCheckerService",
  {
    readonly shouldSkip: (file: FileLike) => Effect.Effect<boolean>;
  }
> = Context.Tag("SkipCheckerService")<
  SkipChecker,
  {
    readonly shouldSkip: (file: FileLike) => Effect.Effect<boolean>;
  }
>();
export class SkipChecker extends SkipCheckerBase {}
