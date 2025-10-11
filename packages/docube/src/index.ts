/* SPDX-License-Identifier: AGPL-3.0-or-later */

import * as Effect from "effect/Effect";
import * as Context from "effect/Context";
import * as Option from "effect/Option";

import { Loader, type FileLike } from "./io";
import { ModuleResolver } from "./utils";
import type { DocubeError } from "./error";

export const transformerMain: Effect.Effect<
  void,
  DocubeError,
  Loader | MainProcessor
> = Effect.gen(function* () {
  const loader = yield* Loader;
  const mainProcessor = yield* MainProcessor;
  const maybeModuleResolver = yield* Effect.serviceOption(ModuleResolver);

  const files = yield* loader.load;

  if (Option.isSome(maybeModuleResolver)) {
    yield* maybeModuleResolver.value.resolve(files);
  }

  yield* Effect.all(files.map(mainProcessor.process));
});

const MainProcessorBase: Context.TagClass<
  MainProcessor,
  "DocubeMainProcessorService",
  {
    readonly process: (file: FileLike) => Effect.Effect<void, DocubeError>;
  }
> = Context.Tag("DocubeMainProcessorService")<
  MainProcessor,
  { readonly process: (file: FileLike) => Effect.Effect<void, DocubeError> }
>();
export class MainProcessor extends MainProcessorBase {}

export {
  type FileLike,
  type FileMeta,
  Loader,
  Writer,
  SkipChecker,
} from "./io";
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
