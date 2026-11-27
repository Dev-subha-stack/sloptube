import { createFileRoute } from "@tanstack/react-router";
import { PostsFeed } from "@/components/posts/PostsFeed";

export const Route = createFileRoute("/posts")({
  head: () => ({
    meta: [
      { title: "Community Posts - sloptube" },
      { name: "description", content: "Text updates, images, and polls from creators on SlopTube." },
      { property: "og:title", content: "Community Posts - sloptube" },
      { property: "og:description", content: "Text updates, images, and polls from creators on SlopTube." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <PostsFeed showFilter />,
});