/**
 * SEO landing pages `/headshots/[useCase]` — decision P11, docs/03-pages.md §3.
 * Stage 1 defines the set and the metadata; full copy (≥ 400 words of useful
 * content per page, tips, FAQ) is written in Stage 4.
 */
export type UseCaseFaq = { q: string; a: string };

export type UseCase = {
  slug: string;
  /** Short label for links (footer, homepage tiles). */
  label: string;
  /** <title> */
  title: string;
  /** meta description */
  description: string;
  h1: string;
  intro: string;
  recommendedStyles: string[];
  tips: string[];
  faq: UseCaseFaq[];
};

export const useCases: readonly UseCase[] = [
  {
    slug: "linkedin",
    label: "LinkedIn",
    title: "AI LinkedIn Headshots",
    description: "LinkedIn headshots that look like you. See free previews before you pay — every photo checked for likeness.",
    h1: "LinkedIn headshots that look like you",
    intro: "", // TODO(stage-4): full copy
    recommendedStyles: ["corporate-gray", "modern-office", "city-bokeh"],
    tips: [],
    faq: [],
  },
  {
    slug: "resume",
    label: "Resume",
    title: "AI Resume Headshots",
    description: "Professional resume and CV photos that look like you. Free previews before you pay.",
    h1: "Resume headshots that look like you",
    intro: "",
    recommendedStyles: ["studio-white", "corporate-gray", "minimal-beige"],
    tips: [],
    faq: [],
  },
  {
    slug: "real-estate-agents",
    label: "Real Estate Agents",
    title: "AI Headshots for Real Estate Agents",
    description: "Approachable, professional headshots for real estate agents. Free previews before you pay.",
    h1: "Headshots for real estate agents",
    intro: "",
    recommendedStyles: ["city-bokeh", "outdoor-park", "golden-hour"],
    tips: [],
    faq: [],
  },
  {
    slug: "lawyers",
    label: "Lawyers",
    title: "AI Headshots for Lawyers",
    description: "Confident, credible headshots for lawyers and law firms. Free previews before you pay.",
    h1: "Headshots for lawyers",
    intro: "",
    recommendedStyles: ["warm-library", "studio-charcoal", "corporate-gray"],
    tips: [],
    faq: [],
  },
  {
    slug: "doctors",
    label: "Doctors",
    title: "AI Headshots for Doctors",
    description: "Trustworthy headshots for doctors and healthcare professionals. Free previews before you pay.",
    h1: "Headshots for doctors",
    intro: "",
    recommendedStyles: ["studio-white", "modern-office", "minimal-beige"],
    tips: [],
    faq: [],
  },
  {
    slug: "speakers",
    label: "Speakers",
    title: "AI Headshots for Speakers",
    description: "Stand-out headshots for speaker bios and event pages. Free previews before you pay.",
    h1: "Headshots for speakers",
    intro: "",
    recommendedStyles: ["studio-charcoal", "creative-color", "city-bokeh"],
    tips: [],
    faq: [],
  },
  {
    slug: "consultants",
    label: "Consultants",
    title: "AI Headshots for Consultants",
    description: "Polished headshots for consultants and advisors. Free previews before you pay.",
    h1: "Headshots for consultants",
    intro: "",
    recommendedStyles: ["glass-meeting-room", "corporate-gray", "modern-office"],
    tips: [],
    faq: [],
  },
];

export function getUseCase(slug: string): UseCase | undefined {
  return useCases.find((u) => u.slug === slug);
}
