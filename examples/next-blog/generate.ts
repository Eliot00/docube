import { transform } from "@docube/org";
import slugify from "slugify";

transform({
  name: "Post",
  directory: "content",
  include: "**/*.org",
  unsafePreValidation(converted) {
    const raw = converted as any;
    return { ...raw, slug: slugify(raw.title) };
  },
  fields: (s) => ({
    title: s.String,
    date: s.String,
    slug: s.String,
  }),
});
