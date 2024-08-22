/* SPDX-License-Identifier: AGPL-3.0-or-later */

import { Context, Effect } from "effect";

import { DocubeError } from "./error";

export class Loader extends Context.Tag("DocubeLoaderService")<
  Loader,
  { readonly load: Effect.Effect<FileLike[], DocubeError> }
>() {}

export type FileLike = {
  readonly _meta: {
    fileName: string;
    directory: string;
  };
  readonly text: Effect.Effect<string, DocubeError>;
};

export class Writer extends Context.Tag("DocubeWriterService")<
  Writer,
  {
    readonly write: (file: FileLike) => Effect.Effect<void, DocubeError>;
  }
>() {}
