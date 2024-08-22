/* SPDX-License-Identifier: AGPL-3.0-or-later */

import { Data } from "effect";

export class DocubeError extends Data.TaggedError("Docube")<{
  message: string;
}> {}
