"use client";

import dynamic from "next/dynamic";

/** The remover (ONNX Runtime, canvas) is client-only and loaded on demand. */
export const BackgroundRemoverClient = dynamic(() => import("@/features/bg-remover/bg-remover").then((m) => m.BackgroundRemover), {
  ssr: false,
  loading: () => <div className="min-h-72 rounded-[16px] border-2 border-dashed border-border bg-surface-2" aria-hidden="true" />,
});
