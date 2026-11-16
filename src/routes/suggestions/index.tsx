import { createFileRoute } from "@tanstack/react-router";
import { MyBugs } from "@/components/bugs/BugPages";

export const Route = createFileRoute("/suggestions/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Suggest a feature | sloptube" },
      { name: "description", content: "Send the sloptube team your feature ideas and follow what happens to them." },
      { property: "og:title", content: "Suggest a feature | sloptube" },
      { property: "og:description", content: "Send the sloptube team your feature ideas and follow what happens to them." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <MyBugs kind="idea" />,
});
