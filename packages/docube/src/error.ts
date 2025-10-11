/* SPDX-License-Identifier: AGPL-3.0-or-later */

import { Data } from "effect";
import type { YieldableError } from "effect/Cause";

const DocubeErrorBase: new (args: {
  readonly message: string;
}) => YieldableError & {
  readonly _tag: "Docube";
} & Readonly<{
    message: string;
  }> = Data.TaggedError("Docube")<{ message: string }>;
export class DocubeError extends DocubeErrorBase {}
