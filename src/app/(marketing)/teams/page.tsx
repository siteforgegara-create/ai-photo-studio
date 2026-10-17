import type { Metadata } from "next";
import { Archive, Link2, Palette } from "lucide-react";
import { brand } from "@/config/brand";
import { StatusBadge } from "@/components/ui/status-badge";
import { WaitlistForm } from "@/features/teams/waitlist-form";

const description = "Consistent headshots for your whole team — one brand background, an invite link for everyone, one archive for the admin. Coming soon: join the waitlist.";

export const metadata: Metadata = {
  title: "Teams",
  description,
  alternates: { canonical: "/teams" },
  openGraph: { title: `Teams · ${brand.name}`, description, url: "/teams" },
};

const benefits = [
  { icon: Palette, title: "One brand background", text: "Everyone gets the same backdrop and framing, so your team page and directory look consistent." },
  { icon: Link2, title: "An invite link for everyone", text: "Share one link. Each person uploads their own selfies — no scheduling a photographer." },
  { icon: Archive, title: "One archive for the admin", text: "Download every team member's photos in a single archive when they're ready." },
] as const;

/** `/teams` — landing + waitlist only (P10, 03-pages §5). No prices or dates. */
export default function TeamsPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="grid items-start gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
        <div>
          <StatusBadge tone="info">Coming soon</StatusBadge>
          <h1 className="mt-4 text-display text-text">Consistent headshots for your whole team</h1>
          <p className="mt-5 max-w-xl text-[17px] leading-7 text-muted">
            The same likeness check and studio quality as our individual shoots — organized for teams of any size.
          </p>
          <ul className="mt-10 flex flex-col gap-4">
            {benefits.map((b) => (
              <li key={b.title} className="flex gap-4 rounded-[16px] border border-border bg-surface p-5 shadow-card">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-brand-soft text-brand-text" aria-hidden="true">
                  <b.icon className="size-5" />
                </span>
                <div>
                  <h2 className="text-[17px] leading-6 font-bold text-text">{b.title}</h2>
                  <p className="mt-1 text-[15px] leading-6 text-muted">{b.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <section aria-labelledby="waitlist-title" className="rounded-[16px] border border-border bg-surface p-6 shadow-card md:p-8 lg:sticky lg:top-[calc(var(--header-h)+24px)]">
          <h2 id="waitlist-title" className="text-h3 text-text">
            Join the Teams waitlist
          </h2>
          <p className="mt-1.5 mb-6 text-[15px] text-muted">Be the first to know when team headshots launch.</p>
          <WaitlistForm />
        </section>
      </div>
    </div>
  );
}
