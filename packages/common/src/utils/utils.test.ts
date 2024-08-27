import { describe, expect, it } from "bun:test";
import type { FileLike } from "docube";

import { makeOutputMeta, type OutputMeta } from ".";

describe("test makeOutputMeta", () => {
  it("should correctly create OutputMeta from FileLike", () => {
    const dummyFile = {
      _meta: {
        fileName: "Test File.md",
        directory: "/path",
      },
    };

    const result = makeOutputMeta(dummyFile as FileLike);
    const expected: OutputMeta = {
      sourceDirectory: "/path",
      sourceFileName: "Test File.md",
      sourceFileType: "md",
      slug: "test-file",
    };
    expect(result).toEqual(expected);
  });

  it("should handle files without extension", () => {
    const dummyFile = {
      _meta: {
        fileName: "README",
        directory: "/root",
      },
    };

    const result = makeOutputMeta(dummyFile as FileLike);

    expect(result).toEqual({
      sourceFileName: "README",
      sourceDirectory: "/root",
      sourceFileType: "unknown",
      slug: "readme",
    });
  });
});
