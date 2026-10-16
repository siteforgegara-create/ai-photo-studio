import { demoManifest } from "@/config/demo-manifest";
import { BeforeAfter } from "@/components/before-after";
import { Logo } from "@/components/ui/logo";
import { SegmentedThemeToggle } from "@/components/ui/segmented-theme-toggle";

/** Auth shell — form on the left, diagonal Before/After art on the right (≥ 1024 px). */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  const art = demoManifest.auth;
  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-2">
      <div className="flex flex-col bg-surface px-4 py-6 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <Logo size="sm" />
          <SegmentedThemeToggle size="sm" />
        </div>
        <main id="main" className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          {children}
        </main>
      </div>
      <div className="hidden p-4 lg:block">
        <BeforeAfter
          variant="diagonal"
          before={art.before}
          after={art.after}
          alt={art.alt}
          caption="Explore the transformation · Example"
          sizes="50vw"
          priority
          className="h-full min-h-[560px]"
        />
      </div>
    </div>
  );
}
