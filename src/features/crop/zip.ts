"use client";

import { saveBlob } from "./render";

/** Builds a ZIP in the browser with fflate (MIT, dynamic import). JPEGs are stored, not re-compressed. */
export async function downloadZip(files: { url: string; name: string }[], zipName: string, onProgress?: (done: number, total: number) => void) {
  const { zip } = await import("fflate");
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
  let done = 0;
  for (const f of files) {
    const res = await fetch(f.url);
    entries[f.name] = [new Uint8Array(await res.arrayBuffer()), { level: 0 }];
    onProgress?.(++done, files.length);
  }
  const data = await new Promise<Uint8Array>((resolve, reject) => zip(entries, (err, out) => (err ? reject(err) : resolve(out))));
  saveBlob(new Blob([data as BlobPart], { type: "application/zip" }), zipName);
}
