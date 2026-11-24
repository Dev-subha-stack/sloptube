// Ported page: the original app's /privacy.
import { createFileRoute } from "@tanstack/react-router";
import { metadataToHead } from "@/lib/seo/head";

import Link from "next/link";
import { ContactEmail, Owner, PublicPage, Section } from "@/components/launch/PublicPage";
import { siteConfig } from "@/site.config";

const metadata = {
  title: "Privacy | sloptube",
  description: "How this instance of sloptube handles account details, content, messages and usage data.",
  alternates: { canonical: "/privacy" },
};

/** /privacy: describe the information this instance uses and the controls available to you. */
function PrivacyPage() {
  return (
    <PublicPage
      page="privacy"
      title="Privacy"
      updated
      intro={
        <p>
          This notice explains how this instance of sloptube, operated by <Owner value={siteConfig.ownerName} />,
          handles information when you browse the site or use an account. Some features require an account; public
          videos can be watched without signing in.
        </p>
      }
    >
      <Section title="Account and sign-in information">
        <ul>
          <li>
            <strong>Account details:</strong> depending on how you sign in, we may receive and store your email address,
            username, display name and account identifier. Your profile may also include a picture, bio, birthday and
            channel banner.
          </li>
          <li>
            <strong>Age check:</strong> the birthday supplied during sign-up is used to enforce the minimum age of 13.
            It is not shown on your public profile.
          </li>
          <li>
            <strong>Sign-in providers:</strong> email/password authentication and Google sign-in are handled through
            the configured Supabase/Lovable Cloud authentication service. The optional Yapin' sign-in integration
            requests the identify scope and does not request an email address. Google and Yapin' process information
            under their own privacy notices.
          </li>
        </ul>
      </Section>

      <Section title="Content and activity">
        <p>When you use the platform, it stores information needed to provide the features you choose, including:</p>
        <ul>
          <li>Videos you upload, video titles and descriptions, thumbnails, channel details, profile pictures and banners.</li>
          <li>Comments, replies, likes, ratings, emoji reactions, subscriptions and notification records.</li>
          <li>Playlists, Watch Later items, watch history and saved playback progress.</li>
          <li>
            Direct messages you send to another account, together with message times, read status, replies, reactions and
            edit or deletion status.
          </li>
          <li>
            Reports, moderation appeals, bug reports, suggestions and messages you send through the contact form.
          </li>
        </ul>
        <p>
          View counts and watch-time information are used for platform features and creator analytics. When you watch
          while signed out, a view may be counted using a random identifier kept in your browser rather than your
          account name.
        </p>
      </Section>

      <Section title="Content visibility and other people">
        <p>
          Public videos and public channel information can be viewed by anyone. Unlisted videos can be watched by
          people who have the link. Private videos are limited to the owner and any accounts the owner has specifically
          shared them with. Choose the visibility setting carefully before publishing.
        </p>
        <p>
          Comments and other public activity can be seen by people who can access the relevant video or channel.
          Direct messages are sent to the account you select, but recipients may copy or share messages outside
          sloptube. Do not send passwords, financial details or other sensitive information in messages.
        </p>
      </Section>

      <Section title="Information stored in your browser">
        <p>
          The sign-in session is kept in browser storage so you can stay signed in. If you use the account switcher,
          sloptube can save session tokens for up to five accounts in local storage on that browser to make switching
          easier. Theme and player preferences are also stored locally. A short-lived cookie is used during the Yapin'
          sign-in process.
        </p>
        <p>
          Anyone who can use an unlocked browser where an account remains signed in may be able to access that account.
          Use a trusted device, sign out and remove saved accounts before sharing or handing over a device.
        </p>
      </Section>

      <Section title="Network and technical information">
        <p>
          Network address and request information may be processed to protect the service and limit abuse. For example,
          the contact form applies limits based on the email address and network address used for a request. The
          hosting and infrastructure providers may also create routine security, access and error logs. The exact
          information and retention period for those logs can depend on the deployment and provider.
        </p>
      </Section>

      <Section title="Service providers">
        <p>
          This instance uses Supabase/Lovable Cloud for account authentication, database services and configured
          storage. Depending on how the operator has configured uploads and delivery, video files may also use
          Cloudflare R2 and Cloudflare network services. The site host and other infrastructure providers process
          information needed to run the service. Google and Yapin' handle their own parts of sign-in when you choose
          those options.
        </p>
        <p>
          We do not sell your account information or use it to create advertising profiles. Information is shared with
          service providers only as needed to operate, secure and support the platform, or where disclosure is required
          by law or needed to protect users and the service.
        </p>
      </Section>

      <Section title="Your choices and account deletion">
        <ul>
          <li>Update your profile and account details in Settings.</li>
          <li>Manage your videos and channel content in Creator Studio, and choose the visibility of each video.</li>
          <li>Clear or pause your watch history using the History controls.</li>
          <li>
            Delete your account from Settings. This action is irreversible and signs you out. Data in backups,
            infrastructure logs or recipients' copies may remain for a period after deletion.
          </li>
          <li>
            Ask for help with a privacy question or a copy of information associated with your account by contacting{" "}
            <ContactEmail /> or using the <Link href="/contact">contact form</Link>.
          </li>
        </ul>
      </Section>

      <Section title="Changes to this notice">
        <p>
          We may update this notice when the service or its data practices change. The date at the top shows when this
          text was last revised. Significant changes may also be announced on the site.
        </p>
      </Section>
    </PublicPage>
  );
}

export const Route = createFileRoute("/privacy")({
  loader: () => null,
  head: () => metadataToHead(metadata),
  component: PrivacyPage,
});
