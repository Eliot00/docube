/* SPDX-License-Identifier: AGPL-3.0-or-later */

import { describe, expect, it } from "bun:test";

import { ContentConverter, FileConverter, type FileLike } from "docube";
import { Effect, Layer } from "effect";

import { ContentValidatorLive, FileConverterLive, makeAppConfig } from "./index";
import { makeOutputMeta } from "./utils";

const file: FileLike = {
	_meta: { fileName: "hello.org", directory: "/posts" },
	text: Effect.succeed("* Hello"),
};

const mockContentConverter = Layer.succeed(
	ContentConverter,
	ContentConverter.of({
		convert: () =>
			Effect.succeed({
				title: "Hello",
				tags: "one two",
				_meta: makeOutputMeta(file),
				body: "<h1>Hello</h1>",
			}),
	}),
);

function runConverter(fileConverter: Layer.Layer<FileConverter, never, never>) {
	return Effect.gen(function* () {
		const converter = yield* FileConverter;
		const converted = yield* converter.convert(file);
		const json = yield* converted.text;
		return JSON.parse(json) as Record<string, unknown>;
	}).pipe(Effect.provide(fileConverter));
}

describe("contentTransform", () => {
	it("applies contentTransform before schema validation", async () => {
		const withTransform = makeAppConfig({
			name: "Post",
			directory: "/posts",
			include: "**/*.org",
			fields: (s) => ({
				title: s.String,
				tags: s.Array(s.String),
			}),
			contentTransform: (converted) => ({
				...converted,
				tags: String(converted.tags).trim().split(" "),
			}),
		});

		const fileConverter = FileConverterLive.pipe(
			Layer.provide(withTransform),
			Layer.provide(ContentValidatorLive.pipe(Layer.provide(withTransform))),
			Layer.provide(mockContentConverter),
		);

		const result = await Effect.runPromise(runConverter(fileConverter));
		expect(result.tags).toEqual(["one", "two"]);
		expect(result.title).toBe("Hello");
	});

	it("fails validation when content does not match the schema", async () => {
		const config = makeAppConfig({
			name: "Post",
			directory: "/posts",
			include: "**/*.org",
			fields: (s) => ({
				title: s.String,
				tags: s.Array(s.String),
			}),
		});

		const fileConverter = FileConverterLive.pipe(
			Layer.provide(config),
			Layer.provide(ContentValidatorLive.pipe(Layer.provide(config))),
			Layer.provide(mockContentConverter),
		);

		let rejected = false;
		try {
			await Effect.runPromise(runConverter(fileConverter));
		} catch {
			rejected = true;
		}
		expect(rejected).toBe(true);
	});

	it("still supports the deprecated unsafePreValidation alias", async () => {
		const legacyConfig = makeAppConfig({
			name: "Post",
			directory: "/posts",
			include: "**/*.org",
			fields: (s) => ({
				title: s.String,
				tags: s.Array(s.String),
			}),
			unsafePreValidation: (converted) => {
				const { tags, ...rest } = converted as { tags?: unknown };
				return {
					...(rest as object),
					tags: String(tags).trim().split(" "),
				};
			},
		});

		const fileConverter = FileConverterLive.pipe(
			Layer.provide(legacyConfig),
			Layer.provide(ContentValidatorLive.pipe(Layer.provide(legacyConfig))),
			Layer.provide(mockContentConverter),
		);

		const result = await Effect.runPromise(runConverter(fileConverter));
		expect(result.tags).toEqual(["one", "two"]);
	});
});
