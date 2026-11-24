// Ported page: the original app's /about.
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { metadataToHead } from "@/lib/seo/head";

import Link from "next/link";
import { ContactEmail, Owner, PublicPage, Section } from "@/components/launch/PublicPage";
import { siteConfig } from "@/site.config";

const metadata = {
  title: "About | sloptube",
  description: "About sloptube, its current features, the people behind this instance and how to get in touch.",
  alternates: { canonical: "/about" },
};

type VersionInfo = { sha: string; builtAt: string | null };

/** Read the deployment's own build identifier instead of inventing a numbered app version. */
function CurrentBuild() {
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/version", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Build information unavailable");
        return (await response.json()) as VersionInfo;
      })
      .then((value) => {
        if (active && typeof value.sha === "string") setVersion(value);
        else if (active) setUnavailable(true);
      })
      .catch(() => {
        if (active) setUnavailable(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (unavailable) return <p>Build information is unavailable in this deployment.</p>;
  if (!version) return <p>Loading build information…</p>;

  const build = version.sha === "dev" ? "development build" : version.sha.slice(0, 7);
  const builtAt =
    version.builtAt && Number.isFinite(Date.parse(version.builtAt))
      ? new Date(version.builtAt).toLocaleString()
      : null;

  return (
    <p>
      Current build: <code>{build}</code>
      {builtAt ? ` · Built ${builtAt}` : ""}
    </p>
  );
}

/** /about: what this instance offers, who runs it and how to get in touch. */
function AboutPage() {
  return (
    <PublicPage
      page="about"
      title="About sloptube"
      intro={<p>A community video platform for watching, sharing and discovering videos and Snips.</p>}
    >
      <Section title="What you can do">
        <ul>
          <li>
            <strong>Watch and discover:</strong> browse the home feed, search videos and channels, explore trending and
            top-rated videos, follow channels, and keep track of your watch history.
          </li>
          <li>
            <strong>Create:</strong> upload videos with browser-side compression, choose public, unlisted or private
            visibility, customise your channel, and manage thumbnails and uploads in Creator Studio.
          </li>
          <li>
            <strong>Watch Snips:</strong> enjoy short-form vertical videos with autoplay controls, a five-second
            countdown before the next clip, manual next-video controls and preloading for upcoming clips.
          </li>
          <li>
            <strong>Connect:</strong> like and rate videos, leave comments and replies, react with emojis, send direct
            messages, follow channels, and receive notifications about activity.
          </li>
          <li>
            <strong>Organise:</strong> create playlists and save videos to Watch Later.
          </li>
          <li>
            <strong>Manage and improve:</strong> use Creator Studio for content management, channel settings, upload
            planning and analytics. Reporting, moderation tools and video appeals help keep the community safer.
          </li>
        </ul>
        <p>
          Features can change as the project is developed. Visit the <Link href="/updates">updates page</Link> for
          recent changes and announcements.
        </p>
      </Section>
      <Section title="The current build">
        <p>
          sloptube does not use a manually assigned public version number. The identifier below is returned by the
          deployment itself, so it reflects the build that is actually running.
        </p>
        <CurrentBuild />
      </Section>
      <Section title="Open source">
        <p>
          The sloptube code is available under the MIT license. You can read it, run your own instance or contribute on{" "}
          <a href={siteConfig.sourceUrl} target="_blank" rel="noreferrer">GitHub</a>.
        </p>
      </Section>
      <Section title="Who runs this copy">
        <p>
          This instance of sloptube is run by <Owner value={siteConfig.ownerName} />. The operator sets the rules for
          this instance and handles moderation under the <Link href="/guidelines">Community Guidelines</Link> and{" "}
          <Link href="/terms">Terms of Service</Link>.
        </p>
      </Section>
      <Section title="Get in touch">
        <p>
          Contact <ContactEmail /> or use the <Link href="/contact">contact form</Link>. Journalists and partners can
          find the logo and screenshots on the <Link href="/press">press page</Link>.
        </p>
      </Section>
    </PublicPage>
  );
}

export const Route = createFileRoute("/about")({
  loader: () => null,
  head: () => metadataToHead(metadata),
  component: AboutPage,
});
