import { PageHeading } from "./page-stub";

export type LegalSection = { id: string; title: string };

/** Legal page shell: max-width 720, `Last updated`, table of contents (03-pages §8). */
export function LegalPage({ title, sections }: { title: string; sections: LegalSection[] }) {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="mx-auto max-w-[720px]">
        <PageHeading overline="LEGAL" title={title} />
        {/* TODO(owner): real date when the legal text is approved (B6). */}
        <p className="mt-3 text-small text-muted">Last updated: TODO(owner)</p>
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
              <p className="mt-2 text-body text-muted">TODO(owner): legal text for this section.</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
