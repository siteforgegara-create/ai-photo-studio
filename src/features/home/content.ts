import type { FaqEntry } from "@/components/marketing/json-ld";

/** Homepage FAQ — answers match docs/00-decisions.md (03-pages §1.10). */
export const homeFaq: readonly FaqEntry[] = [
  { q: "How many selfies do I need?", a: "4 to 8. We check each one instantly and tell you if it's blurry, too dark or too small." },
  { q: "Do I really see results before paying?", a: "Yes. You get 4 free watermarked previews in two styles. One free preview per account." },
  {
    q: "Will the headshots look like me?",
    a: "Every photo is compared with your selfies, and photos that don't pass the likeness check are discarded before you see them.",
  },
  { q: "What if I'm not happy?", a: "You get a full refund until your first download." },
  {
    q: "What resolution and rights do I get?",
    a: "4K on every plan, with a commercial license — use them on LinkedIn, your website, print and ads.",
  },
  { q: "Can I change the background or outfit later?", a: "Yes. Every package includes edit credits for the Studio." },
  {
    q: "What happens to my photos?",
    a: "Selfies are deleted 24 hours after your shoot. Your headshots are kept for 30 days so you can download them, and you can delete everything sooner with one click.",
  },
  { q: "Can I upload photos of someone else?", a: "Only of an adult who has given you explicit permission." },
  { q: "Do you offer team headshots?", a: "Coming soon. Join the waitlist on our Teams page." },
];
