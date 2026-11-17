import { createFileRoute } from "@tanstack/react-router";
import { AnnouncementList } from "@/components/announcements/AnnouncementList";

const title = "What's new | sloptube";
const description = "Announcements from the sloptube team: new features, bug fixes and maintenance.";

export const Route = createFileRoute("/updates")({
  ssr: false,
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="mx-auto max-w-[860px] px-4 py-6 sm:px-6">
      <h1 className="text-[24px] font-normal leading-8 text-text">What's new</h1>
      <p className="mb-5 mt-1 text-[14px] text-text-2">New features, fixes and maintenance news from the sloptube team.</p>
      <AnnouncementList />
    </div>
  ),
});
