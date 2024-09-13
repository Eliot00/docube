/* SPDX-License-Identifier: AGPL-3.0-or-later */

import { Context, Effect, Option } from "effect";

import { Loader, type FileLike } from "./io";
import { ModuleResolver } from "./utils";
import type { DocubeError } from "./error";

export const transformerMain = Effect.gen(function* () {
  const loader = yield* Loader;
  const mainProcessor = yield* MainProcessor;
  const maybeModuleResolver = yield* Effect.serviceOption(ModuleResolver);

  const files = yield* loader.load;

  if (Option.isSome(maybeModuleResolver)) {
    yield* maybeModuleResolver.value.resolve(files);
  }

  yield* Effect.all(files.map(mainProcessor.process));
});

export class MainProcessor extends Context.Tag("DocubeMainProcessorService")<
  MainProcessor,
  { readonly process: (file: FileLike) => Effect.Effect<void, DocubeError> }
>() {}

export { type FileLike, type FileMeta, Loader, Writer } from "./io";
export { DocubeError } from "./error";
export {
  NameNormalization,
  Unified,
  type NormalizedName,
  ModuleResolver,
  FileConverter,
  ContentConverter,
  ContentValidator,
} from "./utils";
