// Old address kept working: /history moved to /feed/history.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/history")({
  beforeLoad: () => {
    throw redirect({ to: "/feed/history" });
  },
});
