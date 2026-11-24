// Ported page: the original app's /terms.
import { createFileRoute } from "@tanstack/react-router";
import { metadataToHead } from "@/lib/seo/head";

import Link from "next/link";
import { ContactEmail, Owner, PublicPage, Section } from "@/components/launch/PublicPage";
import { isPlaceholder, siteConfig } from "@/site.config";

const metadata = {
  title: "Terms of Service | sloptube",
  description: "The rules for accounts, uploads, messages and other use of this sloptube instance.",
  alternates: { canonical: "/terms" },
};

/** /terms: rules for using this instance. This text is not legal advice. */
function TermsPage() {
  const owner = <Owner value={siteConfig.ownerName} />;
  const setupIncomplete =
    isPlaceholder(siteConfig.ownerName) ||
    isPlaceholder(siteConfig.contactEmail) ||
    isPlaceholder(siteConfig.jurisdiction);

  return (
    <PublicPage
      page="terms"
      title="Terms of Service"
      updated
      intro={
        <p>
          These terms apply to your use of this instance of sloptube and form an agreement between you and {owner}, the
          operator of this instance. By using the site or creating an account, you agree to follow these terms and the{" "}
          <Link href="/guidelines">Community Guidelines</Link>.
        </p>
      }
    >
      {setupIncomplete && (
        <p role="note" className="mt-5 rounded-sm border border-divider bg-[var(--hover)] px-3 py-2 text-[13px] leading-5 text-text-2">
          The operator name, contact email and/or governing jurisdiction have not been configured for this deployment.
          The site operator should complete those fields in site.config.ts and obtain appropriate legal review before
          relying on this as a final legal notice.
        </p>
      )}

      <Section title="Who can use sloptube">
        <ul>
          <li>You must be at least 13 years old to create or use an account.</li>
          <li>Give accurate information when creating an account and keep your sign-in credentials secure.</li>
          <li>
            You are responsible for activity carried out through your account. Do not access another person's account
            or attempt to bypass a suspension or other moderation decision.
          </li>
          <li>
            The account switcher can keep several signed-in accounts saved in the browser you use. On a shared device,
            sign out and remove saved accounts when you finish.
          </li>
          <li>You can request account deletion from Settings. Deletion is irreversible and removes access to the account.</li>
        </ul>
      </Section>

      <Section title="Your content and our limited permission to use it">
        <ul>
          <li>
            You keep the rights you hold in videos, thumbnails, channel text, profile images, comments and other
            material you submit.
          </li>
          <li>
            When you submit content, you give the operator a non-exclusive, worldwide, royalty-free permission to host,
            store, reproduce, process, compress or transcode, deliver and display that content as needed to operate,
            secure and provide sloptube and the features you choose. This permission lasts while the content is
            available on the service and ends when you delete it, except for temporary technical copies, backups,
            records required for security or legal reasons, and copies already made by other people.
          </li>
          <li>
            Upload or share only content you created, own or have permission to use. Do not violate copyright,
            trademark, privacy, publicity or other rights.
          </li>
          <li>
            Choose the correct visibility before publishing. Public videos may be discoverable by anyone; unlisted
            videos can be viewed by people with the link; private videos are limited to you and accounts you explicitly
            share them with.
          </li>
          <li>
            You are responsible for the accuracy and legality of what you upload, including thumbnails, titles and
            descriptions.
          </li>
        </ul>
      </Section>

      <Section title="Community behaviour and direct messages">
        <p>
          Do not use sloptube for spam, scams, impersonation, harassment, threats, hate, doxxing, unlawful activity,
          pornography, sexual content involving anyone under 18, or content that encourages serious harm. These rules
          apply to videos, Snips, channel pages, comments and direct messages. Read the full{" "}
          <Link href="/guidelines">Community Guidelines</Link>.
        </p>
        <p>
          Direct messages are a way to communicate with another account, not a promise of end-to-end encryption or
          confidentiality. Do not send passwords, payment information or other sensitive personal information.
        </p>
      </Section>

      <Section title="Moderation and reports">
        <p>
          The operator and authorised moderators may review reports and take action when content or behaviour breaks
          these terms or the Community Guidelines. Actions can include removing content, limiting features, issuing a
          strike, suspending a channel or closing an account. Three strikes within 90 days suspend a channel. A removed
          video can be appealed once through Creator Studio. Serious cases may lead to immediate action.
        </p>
        <p>
          You can report a video, comment or channel using the Report controls. For copyright concerns, use the report
          option marked "Infringes my rights" or contact <ContactEmail /> with the relevant link and an explanation of
          your rights.
        </p>
      </Section>

      <Section title="The service and third-party providers">
        <p>
          sloptube is provided on an "as available" basis. Features may change, be interrupted or be discontinued, and
          the operator does not promise that the site will always be available, error-free or suitable for every
          purpose. Keep your own copies of important material.
        </p>
        <p>
          Authentication, hosting, databases, storage and media delivery may rely on third-party providers. When you
          choose Google or Yapin' sign-in, their own terms and privacy notices also apply. sloptube is not responsible
          for third-party services or websites that it does not control.
        </p>
        <p>
          To the extent permitted by applicable law, the operator excludes implied warranties and is not liable for
          indirect or consequential loss arising from use of the service. Nothing in these terms limits rights or
          remedies that cannot lawfully be excluded.
        </p>
        <p>
          The sloptube software is open source under the MIT license. That software licence is separate from these
          terms, which apply to use of this hosted instance.
        </p>
      </Section>

      <Section title="Changes, contact and governing law">
        <p>
          These terms may change as the service evolves. The date at the top shows when this text was last revised.
          Significant changes may also be announced on the site. Continued use after an updated version takes effect
          means you accept the revised terms, to the extent permitted by law.
        </p>
        <p>
          These terms are governed by the law of <Owner value={siteConfig.jurisdiction} />, subject to any mandatory
          protections that apply to you. Questions or complaints can be sent to <ContactEmail /> or through the{" "}
          <Link href="/contact">contact form</Link>.
        </p>
        <p>
          This page is a practical description of the rules for this instance, not legal advice. The operator should
          have it reviewed for the laws that apply to the service and its users.
        </p>
      </Section>
    </PublicPage>
  );
}

export const Route = createFileRoute("/terms")({
  loader: () => null,
  head: () => metadataToHead(metadata),
  component: TermsPage,
});
