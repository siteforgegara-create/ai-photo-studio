"use client";

import dynamic from "next/dynamic";

export const PhotoEditorClient = dynamic(() => import("@/features/editor/photo-editor-tool").then((m) => m.PhotoEditorTool), {
  ssr: false,
  loading: () => <div className="min-h-72 rounded-[16px] border-2 border-dashed border-border bg-surface-2" aria-hidden="true" />,
});
