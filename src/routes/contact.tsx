// Ported page: the original app's /contact.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { ContactForm } from "@/components/launch/ContactForm";
import { ContactEmail, PublicPage } from "@/components/launch/PublicPage";
import { CONTACT_PER_DAY } from "@/lib/launch/rules";

const metadata = {
  title: "Contact us | sloptube",
  description: "Send a message to the people who run this copy of sloptube.",
  alternates: { canonical: "/contact" },
};

/** /contact: the form (stored in contact_messages, read in /admin/messages). */
function ContactPage() {
  return (
    <PublicPage
      page="contact"
      title="Contact us"
      intro={
        <p>
          Questions, press, a problem with the site or something you want taken down: send it here, or write to{" "}
          <ContactEmail />. Up to {CONTACT_PER_DAY} messages a day.
        </p>
      }
    >
      <ContactForm />
    </PublicPage>
  );
}



export const Route = createFileRoute("/contact")({

  loader: () => null,
  head: () => metadataToHead(metadata),
  component: ContactPage,
});
