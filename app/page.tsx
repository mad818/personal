// ── page ────────────────────────────────────────────────────
// App root: redirects authenticated users to /home or shows login.

import { redirect } from 'next/navigation'
export default function Root() { redirect('/command') }
