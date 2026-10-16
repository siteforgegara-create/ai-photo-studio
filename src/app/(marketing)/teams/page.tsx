import type { Metadata } from "next";
import { PageHeading, StageNote } from "@/components/layout/page-stub";
import { StatusBadge } from "@/components/ui/status-badge";

export const metadata: Metadata = {
  title: "Teams",
  description: "Consistent headshots for your whole team. Coming soon — join the waitlist.",
};

/** `/teams` — landing + waitlist only (P10). Built in Stage 4. */
export default function TeamsPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <StatusBadge tone="info">Coming soon</StatusBadge>
      <PageHeading className="mt-4" title="Consistent headshots for your whole team" />
      <StageNote
        stage={4}
        className="mt-10"
        items={["3 benefits: brand background, invite link, one-archive download", "Waitlist form: work email + team size → WaitlistService.join"]}
      />
    </div>
  );
}
