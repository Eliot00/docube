/* SPDX-License-Identifier: AGPL-3.0-or-later */

import { Effect, Layer } from "effect";
import { NameNormalization } from "docube";
import camelCase from "camelcase";
import pluralize from "pluralize-esm";

export const NameNormalizationLive = Layer.succeed(
  NameNormalization,
  NameNormalization.of({
    normalize: (name) => {
      const capital = camelCase(name, { pascalCase: true });
      const camel = camelCase(name);
      return Effect.succeed({
        typeName: capital,
        moduleName: pluralize(camel),
        variableName: `all${pluralize(capital)}`,
      });
    },
  }),
);
