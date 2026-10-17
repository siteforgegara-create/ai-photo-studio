"use client";

import "./globals.css";

/**
 * Last-resort boundary for errors in the root layout itself. It replaces the
 * whole document, so it renders its own <html>/<body> and stays dependency-free.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 text-center font-sans text-text">
        <h1 className="text-h1">Something went wrong</h1>
        <p className="mt-3 max-w-md text-body text-muted">Please reload the page. Your photos and credits are safe.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-8 inline-flex h-12 items-center rounded-[10px] bg-cta-gradient px-6 font-semibold text-white"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
