import { FileText } from "lucide-react";
import { PageHeading } from "./page-stub";

export type LegalSection = {
  id: string;
  title: string;
  /** Facts from docs/00-decisions.md this section must cover. Not the legal text itself. */
  points?: string[];
};

/**
 * Legal page shell: max-width 720, `Last updated`, table of contents (03-pages §8).
 * The final wording is TODO(owner) — until then each section lists the decided
 * facts it will cover, under a visible "draft" notice.
 */
export function LegalPage({ title, lead, sections }: { title: string; lead?: string; sections: LegalSection[] }) {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="mx-auto max-w-[720px]">
        <PageHeading overline="LEGAL" title={title} lead={lead} />
        {/* TODO(owner): real date when the legal text is approved (B6). */}
        <p className="mt-3 text-small text-muted">Last updated: TODO(owner)</p>
        <p className="mt-6 flex items-start gap-3 rounded-[12px] border border-border bg-warning-soft px-4 py-3 text-[14px] leading-[22px] text-text">
          <FileText className="mt-0.5 size-4 shrink-0 text-warning-text" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Draft.</strong> This page outlines what the final document will cover. The full legal text is being prepared and will replace
            this outline before launch.
          </span>
        </p>
        <nav aria-label="Contents" className="mt-8 rounded-[16px] border border-border bg-surface p-5 shadow-card">
          <h2 className="text-overline text-muted">Contents</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-[14px]">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-text hover:text-brand-text">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="mt-10 flex flex-col gap-8">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-28">
              <h2 id={`${s.id}-h`} className="text-h3 text-text">
                {i + 1}. {s.title}
              </h2>
              {s.points && s.points.length > 0 && (
                <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-body text-text marker:text-muted">
                  {s.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-small text-muted">TODO(owner): legal text for this section.</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
