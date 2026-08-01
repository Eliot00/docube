# @docube/common

## 0.10.0

### Minor Changes

- 65760fb: Improve the `transform` API. Add a typed `contentTransform` option to normalize converted content (e.g. renaming org keywords, coercing types) before schema validation; `unsafePreValidation` is deprecated in its favor. `transform` now returns a `Promise` that resolves on success and rejects on failure, so it can be awaited and errors propagate instead of being logged.

### Patch Changes

- 994d79c: Exclude test files from the build, so test declarations (`.test.d.ts`) are no longer emitted into `dist` or included in published packages.

## 0.9.7

### Patch Changes

- 77357cc: Upgrade dependencies

## 0.9.6

### Patch Changes

- b2b732f: Fix type generation
- Updated dependencies [b2b732f]
  - docube@0.6.4

## 0.9.5

### Patch Changes

- aa65d73: Fix .d.ts generation
- Updated dependencies [aa65d73]
  - docube@0.6.3

## 0.9.4

### Patch Changes

- 878b2ad: Bump effect-ts to v3.18.4
- Updated dependencies [878b2ad]
  - docube@0.6.2

## 0.9.3

### Patch Changes

- Fix cache exists check return type

## 0.9.2

### Patch Changes

- Fix namespace conflict

## 0.9.1

### Patch Changes

- Strip catalog and workspace protocols from package.json
- Updated dependencies
  - docube@0.6.1

## 0.9.0

### Minor Changes

- 8d4464e: Support incremental building

### Patch Changes

- Updated dependencies [8d4464e]
  - docube@0.6.0

## 0.8.1

### Patch Changes

- Revert bun build config
- Updated dependencies
  - docube@0.5.1

## 0.8.0

### Minor Changes

- 441cf6d: Move default Transformer definition to core package and extract `MainProcessor`
- cf78a1f: Exclude package dependencies from bundle build

### Patch Changes

- Updated dependencies [441cf6d]
- Updated dependencies [cf78a1f]
  - docube@0.5.0

## 0.7.0

### Minor Changes

- a1ef363: Catch file IO error

## 0.6.0

### Minor Changes

- a2c6610: Change custom converter type

### Patch Changes

- 5116bf8: Sync monorepo dependencies
- Updated dependencies [5116bf8]
  - docube@0.4.1

## 0.5.0

### Minor Changes

- 0e3b68a: Make writer optional
- 9efe301: Make module resolver optional

## 0.4.1

### Patch Changes

- Fix npm publish error

## 0.4.0

### Minor Changes

- Auto-generate slugs in meta fields from original filenames

## 0.3.0

### Minor Changes

- Support custom unsafe converter

### Patch Changes

- Updated dependencies
  - docube@0.4.0

## 0.2.1

### Patch Changes

- Basic orgmode/mdx support
- Updated dependencies
  - docube@0.3.1
