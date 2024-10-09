/* SPDX-License-Identifier: AGPL-3.0-or-later */

import dts from "bun-plugin-dts";

await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  minify: true,
  target: "node",
  plugins: [dts()],
  packages: 'external',
});
