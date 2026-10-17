import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { notableLicenses, otherLicenses } from "@/config/licenses";
import { PageHeading } from "@/components/layout/page-stub";

export const metadata: Metadata = { title: "Open-source licenses", description: "Third-party software and fonts used on this site and their licenses." };

const linkCls = "inline-flex items-center gap-1 font-semibold text-brand-text underline-offset-2 hover:underline";

/** /licenses — third-party licences (owner decision after Stage 2 review). */
export default function LicensesPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="mx-auto max-w-[760px]">
        <PageHeading overline="LEGAL" title="Open-source licenses" lead="This site is built with open-source software. These are the components that run in your browser and their licenses." />
        <ul className="mt-10 flex flex-col gap-4">
          {notableLicenses.map((l) => (
            <li key={l.name} className="rounded-[16px] border border-border bg-surface p-5 shadow-card">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[18px] leading-6 font-bold text-text">{l.name}</h2>
                <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px] font-semibold text-muted">{l.license}</span>
              </div>
              <p className="mt-1 text-[14px] text-muted">{l.usedFor}</p>
              {l.note && <p className="mt-2 text-[14px] leading-[22px] text-text">{l.note}</p>}
              <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
                <a href={l.sourceUrl} className={linkCls} target="_blank" rel="noopener noreferrer">
                  Source code
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
                <a href={l.licenseUrl} className={linkCls} target="_blank" rel="noopener noreferrer">
                  License text
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </p>
            </li>
          ))}
        </ul>
        <h2 className="mt-12 text-h3 text-text">Other open-source packages</h2>
        <ul className="mt-4 grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
          {otherLicenses.map((l) => (
            <li key={l.name} className="flex items-baseline justify-between gap-3 border-b border-border py-2">
              <a href={l.url} className="font-medium text-text hover:text-brand-text" target="_blank" rel="noopener noreferrer">
                {l.name}
              </a>
              <span className="text-muted">{l.license}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
