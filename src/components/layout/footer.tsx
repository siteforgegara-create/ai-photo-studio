import Link from "next/link";
import { brand } from "@/config/brand";
import { useCases } from "@/config/use-cases";
import { Logo } from "@/components/ui/logo";
import { freeTools } from "./nav-links";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/#examples", label: "Examples" },
      { href: "/teams", label: "Teams" },
    ],
  },
  { title: "Free tools", links: freeTools.map(({ href, label }) => ({ href, label })) },
  { title: "Headshots for", links: useCases.map((u) => ({ href: `/headshots/${u.slug}`, label: u.label })) },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

/** Footer — docs/03-pages.md (common). */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(4,1fr)] md:py-14">
        <div className="max-w-xs">
          <Logo size="sm" />
          <p className="mt-4 text-[14px] leading-[22px] text-muted">{brand.tagline}</p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-overline text-muted">{col.title}</h2>
            <ul className="mt-3 flex flex-col gap-1">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="inline-flex min-h-8 items-center text-[14px] text-text transition-colors hover:text-brand-text">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container-page flex h-14 items-center text-[13px] text-muted">
          © {brand.copyrightYear} {brand.name}
        </div>
      </div>
    </footer>
  );
}
