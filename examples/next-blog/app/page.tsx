import { compareDesc, format, parseISO } from "date-fns";
import { allPosts, type Post } from "@docube/generated";

function PostCard(post: Post) {
  return (
    <div className="mb-8">
      <h2 className="text-xl">{post.title}</h2>
      <time dateTime={post.date} className="block mb-2 text-xs text-gray-600">
        {format(parseISO(post.date), "LLLL d, yyyy")}
      </time>
      <div className="text-sm">
        <article dangerouslySetInnerHTML={{ __html: post.body }} />
      </div>
    </div>
  );
}

export default function Home() {
  const posts = allPosts.sort((a, b) =>
    compareDesc(new Date(a.date), new Date(b.date)),
  );
  return (
    <div className="max-w-xl py-8 mx-auto">
      <h1 className="mb-8 text-3xl font-bold text-center">Next.js Example</h1>
      {posts.map((post, idx) => (
        <PostCard key={idx} {...post} />
      ))}
    </div>
  );
}
