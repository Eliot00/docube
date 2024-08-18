import { make } from "@docube/org";
import { Schema } from "@effect/schema";

make({
  name: "Post",
  directory: "content",
  includes: "**/*.org",
  fields: {
    title: Schema.String,
    date: Schema.String,
  },
});
