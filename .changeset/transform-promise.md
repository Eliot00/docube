---
"@docube/common": minor
"@docube/org": minor
"@docube/markdown": minor
"@docube/mdx": minor
---

Improve the `transform` API. Add a typed `contentTransform` option to normalize converted content (e.g. renaming org keywords, coercing types) before schema validation; `unsafePreValidation` is deprecated in its favor. `transform` now returns a `Promise` that resolves on success and rejects on failure, so it can be awaited and errors propagate instead of being logged.
