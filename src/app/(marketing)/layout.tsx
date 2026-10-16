import { MarketingHeader } from "@/components/layout/marketing-header";
import { Footer } from "@/components/layout/footer";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <MarketingHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
