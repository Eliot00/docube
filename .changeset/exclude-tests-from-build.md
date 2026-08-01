---
"@docube/common": patch
"@docube/org": patch
"@docube/markdown": patch
---

Exclude test files from the build, so test declarations (`.test.d.ts`) are no longer emitted into `dist` or included in published packages.
