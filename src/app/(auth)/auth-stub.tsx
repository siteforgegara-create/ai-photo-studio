import { StageNote } from "@/components/layout/page-stub";

/** Placeholder until the real forms land in Stage 4 (03-pages §7). Use the dev panel to sign in. */
export function AuthStub({ title, lead, fields }: { title: string; lead: string; fields: string[] }) {
  return (
    <div>
      <h1 className="text-h1 text-text">{title}</h1>
      <p className="mt-2 text-body text-muted">{lead}</p>
      <StageNote stage={4} className="mt-8" items={fields} />
    </div>
  );
}
