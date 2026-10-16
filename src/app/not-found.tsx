import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";

/** 404 — 03-pages §9. */
export default function NotFound() {
  return (
    <>
      <MarketingHeader />
      <main id="main" className="flex flex-1 items-center">
        <div className="container-page py-20 text-center">
          <p className="text-overline text-brand-text">404</p>
          <h1 className="mt-3 text-h1 text-text">Page not found</h1>
          <p className="mx-auto mt-3 max-w-md text-body text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="secondary" size="lg">
              <Link href="/">Go to homepage</Link>
            </Button>
            <Button asChild variant="primary" size="lg">
              <Link href="/shoot/new">
                Get your free preview
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
