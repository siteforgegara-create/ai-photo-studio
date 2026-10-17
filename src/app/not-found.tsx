import { MarketingHeader } from "@/components/layout/marketing-header";
import { Footer } from "@/components/layout/footer";
import { NotFoundContent } from "@/components/layout/not-found-content";

/** 404 — 03-pages §9. */
export default function NotFound() {
  return (
    <>
      <MarketingHeader />
      <main id="main" className="flex flex-1 items-center">
        <NotFoundContent />
      </main>
      <Footer />
    </>
  );
}
