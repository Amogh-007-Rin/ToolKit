import Link from "next/link";

export const metadata = { title: "Privacy Policy · ToolKit" };

export default function PolicyPage() {
  return <LegalDocument title="ToolKit Privacy Policy" updated="31 August 2026">
    <p>ToolKit stores the account, profile, collections, posts, social activity, AI conversations, messages, device registrations, and safety reports needed to provide the service.</p>
    <h2>How data is used</h2><p>Data is used to authenticate you, synchronize your content, provide recommendations and realtime messaging, deliver notifications, prevent abuse, and operate the service. AI search messages are sent to the configured model provider to answer the request.</p>
    <h2>Storage and security</h2><p>Passwords are stored as one-way hashes. Native refresh tokens are stored as hashes on the server and in platform secure storage on your device. Private media is served through expiring links. Message content is server-readable and is not end-to-end encrypted.</p>
    <h2>Sharing</h2><p>Public profile, post, and showcased-collection data is visible according to your privacy settings. Operational providers may process data solely to host, deliver email and push notifications, store media, detect failures, or provide AI search.</p>
    <h2>Your controls</h2><p>You can update privacy and notification preferences, export your data, block or report users, and schedule account deletion. Scheduled deletion has a 30-day restoration window before permanent purge.</p>
    <h2>Retention and safety</h2><p>Active account data is retained while needed to provide ToolKit. Security, moderation, and audit evidence may be retained where necessary to protect users, comply with law, or resolve appeals.</p>
    <h2>Children</h2><p>ToolKit is intended for people aged 13 and over. Users below the age required to consent independently in their country must have appropriate guardian authorization.</p>
    <p>This project-specific draft requires owner and legal approval before public release. Contact <Link href="/contact">ToolKit support</Link> with privacy requests.</p>
  </LegalDocument>;
}

function LegalDocument({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return <main className="mx-auto min-h-dvh max-w-3xl bg-background px-5 py-16 text-foreground"><Link href="/" className="text-sm font-semibold text-primary">← ToolKit</Link><h1 className="mt-6 text-4xl font-bold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p><article className="mt-10 space-y-5 leading-7 [&_a]:text-primary [&_h2]:pt-5 [&_h2]:text-xl [&_h2]:font-bold">{children}</article></main>;
}
