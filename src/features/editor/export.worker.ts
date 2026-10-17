/// <reference lib="webworker" />
/**
 * Export worker: renders the final image on an OffscreenCanvas so large
 * exports don't block the UI (02-studio §3.1). Nothing leaves the browser.
 */
import type { EditorState } from "./engine";
import { mimeOf, renderExport, type ExportFormat } from "./render";

type Request = { bitmap: ImageBitmap; state: EditorState; format: ExportFormat };

self.onmessage = async (e: MessageEvent<Request>) => {
  const { bitmap, state, format } = e.data;
  try {
    const canvas = renderExport(bitmap, bitmap.width, bitmap.height, state, format, (w, h) => new OffscreenCanvas(w, h)) as OffscreenCanvas;
    const blob = await canvas.convertToBlob({ type: mimeOf(format), quality: 0.92 });
    bitmap.close();
    (self as unknown as Worker).postMessage({ blob });
  } catch (err) {
    (self as unknown as Worker).postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
