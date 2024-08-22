import { transform } from "@docube/org";

transform({
  name: "Post",
  directory: "content",
  include: "**/*.org",
  fields: (s) => ({
    title: s.String,
    date: s.String,
  }),
});
