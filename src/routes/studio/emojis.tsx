import { createFileRoute } from "@tanstack/react-router";
import { EmojiManager } from "@/components/emojis/EmojiManager";
import { StudioHeader, StudioPage } from "@/components/studio/StudioNotices";

function EmojisPage() {
  return (
    <StudioPage>
      <div data-studio-state="emojis">
        <StudioHeader
          title="Channel emojis"
          hint="Add your own small pictures. Anyone commenting on your videos can use them by typing :name: or picking them from the smiley button."
        />
        <EmojiManager />
      </div>
    </StudioPage>
  );
}

export const Route = createFileRoute("/studio/emojis")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Channel emojis | sloptube Studio" },
      { name: "description", content: "Add custom emojis for comments on your channel's videos." },
      { property: "og:title", content: "Channel emojis | sloptube Studio" },
      { property: "og:description", content: "Add custom emojis for comments on your channel's videos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmojisPage,
});
