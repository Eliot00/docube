import { FileSystem, Path } from "@effect/platform"
import { BunContext, BunRuntime } from "@effect/platform-bun"
import { Console, Effect } from "effect"
import { unified } from "unified"
import parse from 'uniorg-parse'
import uniorg2rehype from 'uniorg-rehype'
import stringify from 'rehype-stringify'
import extractKeywords from "uniorg-extract-keywords"

class LoadError {
    readonly _tag = "LoadError"
}

const processor = unified()
  .use(parse)
  .use(extractKeywords)
  .use(uniorg2rehype)
  .use(stringify)

const process = (content: string) => Effect.promise(() => processor.process(content))

const generate = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const hasDir = yield* fs.exists("content")
  if (!hasDir) {
      yield* Effect.fail(new LoadError())
  }

  yield* Console.log("Generating files to `.docube/generated`")

  yield* fs.makeDirectory(".docube/generated", { recursive: true })

  const fileNames = yield* fs.readDirectory("content")
  const path = yield* Path.Path
  yield* Effect.all(fileNames.map(fileName => Effect.gen(function* () {
      const content = yield* fs.readFileString(`content/${fileName}`)
      const vFile = yield* process(content)
      const output = {
          ...vFile.data,
          _meta: {
              sourceFileName: fileName,
          },
          content: vFile.toString()
      }
      const baseName = path.basename(fileName)
      yield* fs.writeFileString(`.docube/generated/${baseName}.json`, JSON.stringify(output))
  })))
})

BunRuntime.runMain(generate.pipe(Effect.provide(BunContext.layer)))

