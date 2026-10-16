import { AppHeader } from "@/components/layout/app-header";

/** /shoot/* uses the App header (decision V2). */
export default function ShootLayout({ children }: LayoutProps<"/shoot">) {
  return (
    <>
      <AppHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
    </>
  );
}
