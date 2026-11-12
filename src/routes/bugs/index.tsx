import { createFileRoute } from "@tanstack/react-router";
import { MyBugs } from "@/components/bugs/BugPages";

export const Route = createFileRoute("/bugs/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Report a bug | sloptube" },
      { name: "description", content: "Tell the sloptube team about something broken and follow the fix." },
      { property: "og:title", content: "Report a bug | sloptube" },
      { property: "og:description", content: "Tell the sloptube team about something broken and follow the fix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyBugs,
});
