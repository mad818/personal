// ── page ────────────────────────────────────────────────────
// App root: redirects authenticated users to the canonical HQ entrypoint.

import { redirect } from "next/navigation";
export default function Root() {
  redirect("/hq");
}
