import Link from "next/link";

export const metadata = { title: "Support · ToolKit" };

export default function ContactPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@example.com";
  return <main className="mx-auto min-h-dvh max-w-3xl px-5 py-16 text-foreground"><Link href="/" className="text-sm font-semibold text-primary">← ToolKit</Link><h1 className="mt-6 text-4xl font-bold">ToolKit support</h1><p className="mt-4 leading-7 text-muted-foreground">For account access, safety, privacy, or technical help, email <a className="text-primary" href={`mailto:${supportEmail}`}>{supportEmail}</a>. Include your ToolKit tag, but never send a password, access token, refresh token, or private message content.</p><div className="mt-10 grid gap-4 sm:grid-cols-2"><Card title="Safety issue" detail="Use Report inside ToolKit so moderators receive an evidence snapshot." /><Card title="Account deletion" detail="Open Settings → Account and privacy → Delete account. Restoration remains available for 30 days." /><Card title="Privacy request" detail="Export your account data from Settings, or contact support for access and correction questions." /><Card title="Account access" detail="Use verification or password reset first. Support will never ask for your password or recovery token." /></div><p className="mt-10 text-sm text-muted-foreground">The production support address, legal entity, and response-time commitment are owner-controlled release gates.</p></main>;
}

function Card({ title, detail }: { title: string; detail: string }) { return <section className="rounded-3xl border border-border bg-card p-5"><h2 className="font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p></section>; }
