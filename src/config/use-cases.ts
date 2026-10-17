/**
 * SEO landing pages `/headshots/[useCase]` — decision P11, docs/03-pages.md §3.
 * Every page carries ≥ 400 words of useful copy (checked by config.test.ts).
 * Rules (CLAUDE.md §3.2): no invented numbers, reviews or competitor names;
 * product claims only from docs/00-decisions.md.
 */
export type UseCaseFaq = { q: string; a: string };
export type UseCaseTip = { title: string; text: string };

export type UseCase = {
  slug: string;
  /** Short label for links (footer, homepage tiles). */
  label: string;
  /** <title> */
  title: string;
  /** meta description */
  description: string;
  h1: string;
  /** Hero lead (one sentence). */
  lead: string;
  /** Opening paragraphs. */
  intro: string[];
  /** "What makes a good … headshot" section. */
  guide: { title: string; paragraphs: string[] };
  recommendedStyles: string[];
  tips: UseCaseTip[];
  faq: UseCaseFaq[];
};

export const useCases: readonly UseCase[] = [
  {
    slug: "linkedin",
    label: "LinkedIn",
    title: "AI LinkedIn Headshots",
    description:
      "LinkedIn headshots that look like you. See free previews before you pay — every photo checked for likeness, 4K on every plan.",
    h1: "LinkedIn headshots that look like you",
    lead: "A clear, friendly profile photo in your own likeness — from a few selfies, with free previews before you pay.",
    intro: [
      "Your LinkedIn photo is usually the first thing a recruiter, client or new colleague sees, often before they read a single line of your profile. It shows up next to every comment, message and application, and at that size people mostly notice two things: whether the photo looks professional, and whether it looks like the person they are about to meet.",
      "That second part is where many AI headshots fall short. A polished portrait that doesn't quite look like you can feel awkward the moment you join a video call. We compare every generated photo with your selfies and discard the ones that don't pass the likeness check, so the photos you choose from are the ones that still look like you.",
    ],
    guide: {
      title: "What makes a good LinkedIn headshot",
      paragraphs: [
        "Keep the focus on your face. Frame from the chest or shoulders up, look into the camera and leave a little space above your head so the circular crop doesn't cut it off. A calm, uncluttered background — a soft gray, a gently blurred office or a city street — keeps attention where it belongs.",
        "Dress the way you would for an important meeting in your field. For most people that means a jacket or a simple, solid-colored top; creative roles can be a bit more relaxed. Natural expression beats a forced smile: a relaxed face reads as approachable and confident.",
      ],
    },
    recommendedStyles: ["corporate-gray", "modern-office", "city-bokeh"],
    tips: [
      {
        title: "Use a square crop of at least 400×400 px",
        text: "LinkedIn displays profile photos as a circle cropped from a square. Our free photo editor has a 400×400 preset, and every package photo is 4K, so there is plenty of resolution to crop from.",
      },
      {
        title: "Fill most of the frame with your face",
        text: "At thumbnail size a small face disappears. Head and shoulders should take up most of the square.",
      },
      {
        title: "Match the banner",
        text: "If your banner is busy or colorful, pick a plain backdrop for the headshot so the two don't compete.",
      },
      {
        title: "Keep it current",
        text: "Use a photo that looks like you today — same hairstyle, same glasses — so people recognize you in person and on calls.",
      },
    ],
    faq: [
      {
        q: "Will the headshots look like me?",
        a: "Every photo is compared with your selfies, and photos that don't pass the likeness check are discarded before you see them.",
      },
      {
        q: "Can I try it before I pay?",
        a: "Yes. You get 4 free watermarked previews in two styles. One free preview per account.",
      },
      {
        q: "Can I use the photos on LinkedIn and my company website?",
        a: "Yes. Every plan includes 4K files and a commercial license, so you can use them on LinkedIn, your website, print and ads.",
      },
      {
        q: "What if I want a different background later?",
        a: "Every package includes edit credits for the Studio, where you can change the background, outfit or lighting of any photo.",
      },
    ],
  },
  {
    slug: "resume",
    label: "Resume",
    title: "AI Resume Headshots",
    description:
      "Professional resume and CV photos that look like you. Free previews before you pay, 4K files and a commercial license.",
    h1: "Resume headshots that look like you",
    lead: "A neutral, professional photo for your CV, application portals and job profiles — in your own likeness.",
    intro: [
      "Whether a resume should include a photo depends on where you apply. In some countries a photo on a CV is expected; in others recruiters prefer resumes without one, and the photo lives on your LinkedIn profile or the application portal instead. Either way, when a photo is asked for, it should look professional and unmistakably like you.",
      "We generate your headshots from 4–8 selfies, check each selfie for quality in your browser, and compare every result with your selfies before you see it. You get a free preview first, so you only pay if you like how you look.",
    ],
    guide: {
      title: "What makes a good resume photo",
      paragraphs: [
        "Think passport-friendly, but warmer. A plain light background, even lighting and a straight-on pose work for almost any employer. Keep the crop tight — head and upper shoulders — because resume templates usually reserve only a small box for the photo.",
        "Clothing should match the role you are applying for, not the one you have now. Solid colors photograph better than busy patterns, and a calm, friendly expression comes across as confident without looking staged.",
        "Use the same photo wherever a recruiter might look you up — the application portal, your CV and your professional profiles. Seeing one consistent, current photo makes your application feel coherent and helps the interviewer recognize you when the call starts.",
      ],
    },
    recommendedStyles: ["studio-white", "corporate-gray", "minimal-beige"],
    tips: [
      {
        title: "Check what the employer expects",
        text: "Read the job posting and local conventions. If photos aren't customary where you apply, keep the headshot for LinkedIn and portals instead.",
      },
      {
        title: "Use a 3:4 portrait crop",
        text: "Most CV templates use a portrait-shaped photo box. The resume download format and our free photo editor both crop to 3:4.",
      },
      {
        title: "Choose a light, plain backdrop",
        text: "White, light gray or beige keeps the page clean and prints well in black and white.",
      },
      {
        title: "Export a reasonably small file",
        text: "Application forms often limit upload size. Crop and save as JPEG in the photo editor to get a light file without losing quality.",
      },
    ],
    faq: [
      {
        q: "Do I need many selfies?",
        a: "No — 4 to 8. We check each one instantly and tell you if it's blurry, too dark or too small.",
      },
      {
        q: "Can I see results before paying?",
        a: "Yes. You get 4 free watermarked previews in two styles. One free preview per account.",
      },
      {
        q: "What if I'm not happy with my shoot?",
        a: "You get a full refund until your first download.",
      },
      {
        q: "How long are my photos stored?",
        a: "Selfies are deleted 24 hours after your shoot. Your headshots are kept for 30 days so you can download them, and you can delete everything sooner with one click.",
      },
    ],
  },
  {
    slug: "real-estate-agents",
    label: "Real Estate Agents",
    title: "AI Headshots for Real Estate Agents",
    description:
      "Approachable, professional headshots for real estate agents — for listings, signs, cards and your website. Free previews before you pay.",
    h1: "Headshots for real estate agents",
    lead: "Warm, trustworthy photos for listings, yard signs, business cards and your website — in your own likeness.",
    intro: [
      "In real estate your face is part of your brand. It appears on listing pages, signs, flyers, business cards, email signatures and social posts, and clients often recognize you from the photo before you ever shake hands. That makes consistency important: the same likeness everywhere, and a photo that still looks like you when you open the door at a showing.",
      "Instead of booking a studio session every time you need a refresh, upload a few selfies and pick from styles that suit the way you work — outdoor light for a neighborhood specialist, a city backdrop for urban listings or a clean studio look for print.",
    ],
    guide: {
      title: "What makes a good real estate headshot",
      paragraphs: [
        "Approachable beats corporate. A genuine smile, relaxed shoulders and natural light make you look like someone people want to call. Outdoor and golden-hour backdrops suit the industry well, because they hint at homes and neighborhoods rather than offices.",
        "Plan for many formats at once. The same photo may be cropped into a circle on a website, a square on social media and a small rectangle on a sign. Choose a frame with some space around you, so every crop still works.",
        "Refresh your photo when your look changes. Clients who meet you after seeing an old headshot notice the difference, and an outdated photo on a sign stays in front of people for a long time.",
      ],
    },
    recommendedStyles: ["city-bokeh", "outdoor-park", "golden-hour"],
    tips: [
      {
        title: "Keep one signature photo",
        text: "Use the same headshot across signs, cards and listings so people connect your face with your name.",
      },
      {
        title: "Get a few variations",
        text: "A smiling and a more neutral version, or two backdrops, give you options for different marketing materials without breaking consistency.",
      },
      {
        title: "Crop for print and web",
        text: "Use the free photo editor or the download formats to make square, round and 16:9 versions; 4K files leave room for print.",
      },
      {
        title: "Dress for your market",
        text: "Match what clients in your area expect — a blazer for luxury listings, smart casual for a relaxed suburban market.",
      },
    ],
    faq: [
      {
        q: "Can I use the photos on signs and printed marketing?",
        a: "Yes. Every plan includes 4K files and a commercial license — use them on LinkedIn, your website, print and ads.",
      },
      {
        q: "Will the photos look like me?",
        a: "Every photo is compared with your selfies, and photos that don't pass the likeness check are discarded before you see them.",
      },
      {
        q: "Can I change the background later?",
        a: "Yes. Every package includes edit credits for the Studio, where you can change the background, outfit or lighting of any photo.",
      },
      {
        q: "Do you offer headshots for a whole brokerage?",
        a: "Team headshots are coming soon. Join the waitlist on our Teams page.",
      },
    ],
  },
  {
    slug: "lawyers",
    label: "Lawyers",
    title: "AI Headshots for Lawyers",
    description:
      "Confident, credible headshots for lawyers and law firms — firm bios, directories and LinkedIn. Free previews before you pay.",
    h1: "Headshots for lawyers",
    lead: "Credible, composed photos for firm bios, legal directories and LinkedIn — in your own likeness.",
    intro: [
      "Clients often look up a lawyer before the first call: the firm's bio page, a directory listing, LinkedIn. In that moment the photo does quiet but important work — it should look competent, calm and current, and it should match the person who will sit across the table.",
      "Our headshots are generated from your selfies, and every result is checked for likeness before you see it. You can preview the look for free, then choose a package with 4K files and a commercial license that covers firm websites and print.",
    ],
    guide: {
      title: "What makes a good headshot for lawyers",
      paragraphs: [
        "Most firms favor a classic, restrained look: a dark or neutral backdrop, a suit or tailored jacket and a steady, direct gaze. A warm library or a deep charcoal backdrop adds gravitas without distracting from your face.",
        "If your firm has a house style for bios — a specific background color or crop — match it so your photo sits naturally next to your colleagues'. The Studio's background tool lets you adjust a photo afterwards instead of starting over.",
        "Detail matters at small sizes. Directory listings often show the photo as a small thumbnail, so a clean silhouette against a contrasting background and a well-lit face keep you recognizable even when the image is tiny. Avoid busy patterns that turn into noise when scaled down.",
      ],
    },
    recommendedStyles: ["warm-library", "studio-charcoal", "corporate-gray"],
    tips: [
      {
        title: "Follow the firm's bio style",
        text: "Check the background and crop your firm uses on its website and match them; consistency across a team page looks professional.",
      },
      {
        title: "Choose a classic outfit",
        text: "A dark suit or jacket with a plain shirt rarely dates and suits most practice areas.",
      },
      {
        title: "Keep the expression open",
        text: "Serious doesn't have to mean stern. A slight, natural smile reads as confident and approachable.",
      },
      {
        title: "Update directory listings together",
        text: "Use the same photo on your bio, directories and LinkedIn so clients recognize you everywhere.",
      },
    ],
    faq: [
      {
        q: "Can my firm use the photos on its website?",
        a: "Yes. Every plan includes 4K files and a commercial license — use them on LinkedIn, your website, print and ads.",
      },
      {
        q: "Can I match my firm's background color?",
        a: "Yes. In the Studio you can replace the background, including a solid brand color, using your edit credits.",
      },
      {
        q: "What happens to my selfies?",
        a: "Selfies are deleted 24 hours after your shoot. Your headshots are kept for 30 days, and you can delete everything sooner with one click.",
      },
      {
        q: "Is there an option for the whole firm?",
        a: "Team headshots are coming soon. Join the waitlist on our Teams page.",
      },
    ],
  },
  {
    slug: "doctors",
    label: "Doctors",
    title: "AI Headshots for Doctors",
    description:
      "Trustworthy headshots for doctors and healthcare professionals — clinic websites, profiles and telehealth. Free previews before you pay.",
    h1: "Headshots for doctors",
    lead: "Warm, trustworthy photos for clinic websites, provider profiles and telehealth — in your own likeness.",
    intro: [
      "Patients often meet you online first: on a clinic or hospital website, a booking profile or a telehealth app. A good headshot helps them feel at ease before the appointment — and it matters that the person on screen looks like the person who walks into the exam room.",
      "Upload a few selfies on your break, preview the result for free, and choose from styles that suit healthcare: bright studio light, a calm modern interior or a simple neutral backdrop. Every generated photo is checked for likeness before you see it.",
    ],
    guide: {
      title: "What makes a good headshot for doctors",
      paragraphs: [
        "Warmth and clarity come first. Soft, even light, a genuine expression and a clean background make you look approachable. Many clinicians choose a white coat or scrubs for patient-facing pages and a jacket for conferences and publications — the Studio's outfit tool includes both.",
        "Keep it simple and current. Patients use the photo to recognize you, so match your everyday look: the same glasses, a similar hairstyle and a natural expression.",
        "Think about where the photo will appear. Booking apps and telehealth platforms show small, often circular thumbnails, while clinic websites and printed materials use larger portraits. A centered composition with space around your head and shoulders works for all of them, and the 4K original leaves room to crop.",
      ],
    },
    recommendedStyles: ["studio-white", "modern-office", "minimal-beige"],
    tips: [
      {
        title: "Check your organization's guidelines",
        text: "Hospitals and clinics often have rules for provider photos — background, attire and crop. Follow them so your profile fits in.",
      },
      {
        title: "Have a clinical and a formal version",
        text: "A white coat or scrubs for patient pages, a jacket for speaker bios and publications. Outfit edits in the Studio make the second version easy.",
      },
      {
        title: "Prefer bright, even light",
        text: "Light backdrops and soft light read as calm and clean, especially at small sizes in booking apps.",
      },
      {
        title: "Crop for the platform",
        text: "Use the free photo editor for square or round crops, and the 4K original for print.",
      },
    ],
    faq: [
      {
        q: "Can I change my outfit to a white coat or scrubs?",
        a: "Yes. The Studio's outfit tool includes a medical white coat and scrubs; edits use your included edit credits.",
      },
      {
        q: "Will the photos look like me?",
        a: "Every photo is compared with your selfies, and photos that don't pass the likeness check are discarded before you see them.",
      },
      {
        q: "Can my clinic use the photos?",
        a: "Yes. Every plan includes 4K files and a commercial license — use them on your website, print and ads.",
      },
      {
        q: "How do I try it?",
        a: "Upload 4–8 selfies and you'll get 4 free watermarked previews in two styles. One free preview per account.",
      },
    ],
  },
  {
    slug: "speakers",
    label: "Speakers",
    title: "AI Headshots for Speakers",
    description:
      "Stand-out headshots for speaker bios, event pages and press kits — in your own likeness. Free previews before you pay.",
    h1: "Headshots for speakers",
    lead: "Confident photos for speaker bios, event pages, posters and press kits — in your own likeness.",
    intro: [
      "Event organizers need a speaker photo for the agenda, the website, social posts and sometimes stage screens. They may crop it to a circle, place it on a colored banner or print it large, so a speaker headshot has to work in many contexts while still looking like you when you step on stage.",
      "Generate a set of headshots from a few selfies, preview them for free, and pick a few different looks — a bold studio portrait, a city backdrop, a creative color — for different kinds of events. Every photo is checked for likeness before you see it.",
    ],
    guide: {
      title: "What makes a good speaker headshot",
      paragraphs: [
        "Personality matters more here than in a corporate profile. A confident expression, good contrast and a backdrop with some character help your photo stand out in a lineup of speakers. Dark or colorful backdrops work well on event graphics.",
        "Think about how organizers will use it. Leave space around your head and shoulders so the photo can be cropped to a circle or a wide banner, and keep a version with a plain background that is easy to cut out.",
        "Send organizers files that are ready to use. A high-resolution original, a square crop and a short note on how you prefer to be cropped save back-and-forth before the event and reduce the chance of an awkward crop on the agenda page.",
      ],
    },
    recommendedStyles: ["studio-charcoal", "creative-color", "city-bokeh"],
    tips: [
      {
        title: "Prepare a small press kit",
        text: "Keep a portrait, a square and a wide version ready. The download formats and the free photo editor produce all three from one photo.",
      },
      {
        title: "Offer a cut-out",
        text: "Some designers need a photo without a background. Our free background remover makes a transparent PNG in your browser.",
      },
      {
        title: "Vary the looks",
        text: "A formal studio look for corporate events and a creative style for festivals and podcasts.",
      },
      {
        title: "Keep it recent",
        text: "Attendees compare the photo with the person on stage — update it when your look changes.",
      },
    ],
    faq: [
      {
        q: "Can I use the photos on event posters and ads?",
        a: "Yes. Every plan includes 4K files and a commercial license — use them on LinkedIn, your website, print and ads.",
      },
      {
        q: "Can I get more creative styles?",
        a: "Yes. The Studio's Creative Style tool offers looks like editorial black and white or cinematic light; creative edits cost 2 credits per variant.",
      },
      {
        q: "Do I see results before paying?",
        a: "Yes. You get 4 free watermarked previews in two styles. One free preview per account.",
      },
      {
        q: "What if I'm not happy?",
        a: "You get a full refund until your first download.",
      },
    ],
  },
  {
    slug: "consultants",
    label: "Consultants",
    title: "AI Headshots for Consultants",
    description:
      "Polished headshots for consultants and advisors — proposals, websites and LinkedIn. Free previews before you pay.",
    h1: "Headshots for consultants",
    lead: "Polished, credible photos for proposals, your website and LinkedIn — in your own likeness.",
    intro: [
      "As a consultant you are the product. Prospective clients see your photo on proposals, pitch decks, your website and LinkedIn, often before you have spoken to them. A sharp, current headshot signals that you take the details seriously — and it helps when the client recognizes you on the first video call.",
      "Create a set of headshots from a few selfies without scheduling a studio session. Preview them for free, choose the styles that match your clients — a meeting room, a modern office or a classic gray — and download 4K files with a commercial license.",
    ],
    guide: {
      title: "What makes a good consultant headshot",
      paragraphs: [
        "Aim for polished and approachable. Business attire that matches your clients' world, a relaxed but confident expression and a professional setting — a bright meeting room or an office softly out of focus — suggest experience without feeling stiff.",
        "Consistency builds a recognizable personal brand. Use the same photo across your website, proposals and profiles, and keep a second variation for speaking or articles.",
        "Pay attention to how the photo sits next to your colleagues or partners. On a team page or in a proposal, photos with a similar crop, light and background look intentional. If you work with associates, agreeing on one backdrop style makes the whole team look more established.",
      ],
    },
    recommendedStyles: [
      "glass-meeting-room",
      "corporate-gray",
      "modern-office",
    ],
    tips: [
      {
        title: "Match your clients' dress code",
        text: "Suit and tie for finance and public sector, smart casual for tech and creative clients.",
      },
      {
        title: "Use one photo everywhere",
        text: "Website, proposals, LinkedIn and email signature — one consistent image makes you easier to remember.",
      },
      {
        title: "Prepare a wide version for decks",
        text: "A 16:9 crop with space beside you works well on title and team slides. Crop it in the free photo editor.",
      },
      {
        title: "Refresh without a reshoot",
        text: "Change the background or outfit of an existing photo in the Studio when your positioning changes.",
      },
    ],
    faq: [
      {
        q: "Can I use the photos in client proposals?",
        a: "Yes. Every plan includes 4K files and a commercial license — use them on LinkedIn, your website, print and ads.",
      },
      {
        q: "How many selfies do I need?",
        a: "4 to 8. We check each one instantly and tell you if it's blurry, too dark or too small.",
      },
      {
        q: "Is there a subscription?",
        a: "No. You pay once for a shoot, and your edit credits never expire.",
      },
      {
        q: "What happens to my photos?",
        a: "Selfies are deleted 24 hours after your shoot. Your headshots are kept for 30 days so you can download them, and you can delete everything sooner with one click.",
      },
    ],
  },
];

export function getUseCase(slug: string): UseCase | undefined {
  return useCases.find((u) => u.slug === slug);
}

/** Words of useful copy on a page (intro, guide, tips, FAQ) — the SEO minimum is 400. */
export function countUseCaseWords(u: UseCase): number {
  const text = [
    u.lead,
    ...u.intro,
    u.guide.title,
    ...u.guide.paragraphs,
    ...u.tips.flatMap((t) => [t.title, t.text]),
    ...u.faq.flatMap((f) => [f.q, f.a]),
  ].join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}
