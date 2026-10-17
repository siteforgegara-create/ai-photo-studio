/**
 * Third-party licences shown on /licenses. Keep in sync when dependencies
 * that ship to the browser change. LGPL code (libheif inside heic2any) is used
 * unmodified and loaded as a separate lazy chunk only for HEIC files.
 */
export type LicenseEntry = {
  name: string;
  usedFor: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  note?: string;
};

export const notableLicenses: readonly LicenseEntry[] = [
  {
    name: "Inter typeface",
    usedFor: "The only font on the site",
    license: "SIL Open Font License 1.1",
    licenseUrl: "https://openfontlicense.org/open-font-license-official-text/",
    sourceUrl: "https://github.com/rsms/inter",
  },
  {
    name: "MediaPipe Tasks Vision",
    usedFor: "In-browser face detection for the selfie check and face-centred crops",
    license: "Apache License 2.0",
    licenseUrl: "https://www.apache.org/licenses/LICENSE-2.0",
    sourceUrl: "https://github.com/google-ai-edge/mediapipe",
  },
  {
    name: "BlazeFace short-range face detection model",
    usedFor: "Model used by the face detector (from @mediapipe/face_detection)",
    license: "Apache License 2.0",
    licenseUrl: "https://www.apache.org/licenses/LICENSE-2.0",
    sourceUrl: "https://github.com/google-ai-edge/mediapipe",
  },
  {
    name: "heic2any",
    usedFor: "Converting iPhone HEIC photos to JPEG in your browser",
    license: "MIT",
    licenseUrl: "https://github.com/alexcorvi/heic2any/blob/master/LICENSE.md",
    sourceUrl: "https://github.com/alexcorvi/heic2any",
  },
  {
    name: "libheif",
    usedFor: "HEIC decoder bundled inside heic2any",
    license: "GNU Lesser General Public License v3.0",
    licenseUrl: "https://www.gnu.org/licenses/lgpl-3.0.html",
    sourceUrl: "https://github.com/strukturag/libheif",
    note: "Used unmodified, as distributed with heic2any 0.0.4. It is loaded as a separate file only when you add a HEIC photo, so it can be replaced independently. The exact build is available in the heic2any repository.",
  },
];

/** Other open-source packages in the browser bundle (permissive licences). */
export const otherLicenses: readonly { name: string; license: string; url: string }[] = [
  { name: "Next.js", license: "MIT", url: "https://github.com/vercel/next.js" },
  { name: "React", license: "MIT", url: "https://github.com/facebook/react" },
  { name: "Radix UI", license: "MIT", url: "https://github.com/radix-ui/primitives" },
  { name: "Tailwind CSS", license: "MIT", url: "https://github.com/tailwindlabs/tailwindcss" },
  { name: "Motion", license: "MIT", url: "https://github.com/motiondivision/motion" },
  { name: "Lucide", license: "ISC", url: "https://github.com/lucide-icons/lucide" },
  { name: "Zustand", license: "MIT", url: "https://github.com/pmndrs/zustand" },
  { name: "next-themes", license: "MIT", url: "https://github.com/pacocoursey/next-themes" },
  { name: "React Hook Form", license: "MIT", url: "https://github.com/react-hook-form/react-hook-form" },
  { name: "Zod", license: "MIT", url: "https://github.com/colinhacks/zod" },
  { name: "fflate", license: "MIT", url: "https://github.com/101arrowz/fflate" },
  { name: "idb-keyval", license: "Apache-2.0", url: "https://github.com/jakearchibald/idb-keyval" },
  { name: "class-variance-authority", license: "Apache-2.0", url: "https://github.com/joe-bell/cva" },
  { name: "tailwind-merge", license: "MIT", url: "https://github.com/dcastil/tailwind-merge" },
  { name: "clsx", license: "MIT", url: "https://github.com/lukeed/clsx" },
  { name: "tw-animate-css", license: "MIT", url: "https://github.com/Wombosvideo/tw-animate-css" },
];
