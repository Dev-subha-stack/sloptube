import { createFileRoute } from "@tanstack/react-router";
import { MessagesView } from "@/components/messages/MessagesView";

export const Route = createFileRoute("/messages")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Messages | sloptube" },
      { name: "description", content: "Private messages between you and other people on sloptube." },
      { property: "og:title", content: "Messages | sloptube" },
      { property: "og:description", content: "Private messages between you and other people on sloptube." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MessagesView,
});
