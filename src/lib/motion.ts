/** True when the user asked the OS to reduce motion (WCAG 2.3.3). Safe on the server. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** `scrollIntoView` behaviour that respects reduced motion — CSS `scroll-behavior` does not cover explicit "smooth". */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}
