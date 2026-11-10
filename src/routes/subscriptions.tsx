// Old address kept working: /subscriptions moved to /feed/subscriptions.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/subscriptions")({
  beforeLoad: () => {
    throw redirect({ to: "/feed/subscriptions" });
  },
});
