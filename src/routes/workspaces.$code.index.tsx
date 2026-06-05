import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/workspaces/$code/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/workspaces/$code/dashboard",
      params: { code: params.code },
    });
  },
});
