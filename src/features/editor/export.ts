"use client";

import type { EditorState } from "./engine";
import { mimeOf, renderExport, type ExportFormat } from "./render";

function supportsWorkerExport() {
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return false;
  try {
    const ctx = new OffscreenCanvas(1, 1).getContext("2d");
    return !!ctx && "filter" in ctx;
  } catch {
    return false;
  }
}

function exportInWorker(bitmap: ImageBitmap, state: EditorState, format: ExportFormat): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./export.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ blob?: Blob; error?: string }>) => {
      worker.terminate();
      if (e.data.blob) resolve(e.data.blob);
      else reject(new Error(e.data.error ?? "Export failed"));
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || "Export worker failed"));
    };
    worker.postMessage({ bitmap, state, format }, [bitmap]);
  });
}

function exportOnMainThread(source: ImageBitmap, state: EditorState, format: ExportFormat): Promise<Blob> {
  const canvas = renderExport(source, source.width, source.height, state, format, (w, h) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }) as HTMLCanvasElement;
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), mimeOf(format), 0.92));
}

/**
 * Exports the edited image (OffscreenCanvas in a Worker when supported,
 * main-thread canvas otherwise). The result is re-encoded — no EXIF.
 */
export async function exportImage(source: ImageBitmap, state: EditorState, format: ExportFormat): Promise<Blob> {
  if (supportsWorkerExport()) {
    try {
      return await exportInWorker(await createImageBitmap(source), state, format);
    } catch {
      /* fall through to the main thread */
    }
  }
  return exportOnMainThread(source, state, format);
}
