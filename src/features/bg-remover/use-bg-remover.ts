"use client";

import * as React from "react";
import { prepareImage } from "@/features/selfie-check/prepare";
import { saveBlob } from "@/features/crop/render";
import { compose, cutout, maskCanvas, toBlob, type BackgroundChoice } from "./composite";
import { BG_MODEL, loadModelBytes, modelInputSize, type ModelProgress } from "./model";

export type RemoverStatus =
  | { kind: "idle" }
  | { kind: "model"; progress: ModelProgress }
  | { kind: "processing" }
  | { kind: "done" }
  | { kind: "error"; message: string };

type MatteReply = { type: "matte"; id: number; matte: Float32Array; width: number; height: number } | { type: "error"; id: number; message: string } | { type: "ready" };

/** One worker + one loaded model per tab; reused across photos. */
let workerPromise: Promise<Worker> | null = null;

function getWorker(onProgress: (p: ModelProgress) => void): Promise<Worker> {
  workerPromise ??= (async () => {
    const bytes = await loadModelBytes(onProgress);
    const worker = new Worker(new URL("./matte.worker.ts", import.meta.url), { type: "module" });
    await new Promise<void>((resolve, reject) => {
      const onMsg = (e: MessageEvent<MatteReply>) => {
        if (e.data.type === "ready") resolve();
        else if (e.data.type === "error") reject(new Error(e.data.message));
        worker.removeEventListener("message", onMsg);
      };
      worker.addEventListener("message", onMsg);
      worker.addEventListener("error", (ev) => reject(new Error(ev.message || "Worker failed")), { once: true });
      worker.postMessage({ type: "init", model: bytes }, [bytes]);
    });
    return worker;
  })().catch((err) => {
    workerPromise = null;
    throw err;
  });
  return workerPromise;
}

let nextId = 1;

function runMatte(worker: Worker, source: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const { width, height } = modelInputSize(source.width, source.height);
  const small = document.createElement("canvas");
  small.width = width;
  small.height = height;
  const ctx = small.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const onMsg = (e: MessageEvent<MatteReply>) => {
      const d = e.data;
      if (d.type === "ready" || d.id !== id) return;
      worker.removeEventListener("message", onMsg);
      if (d.type === "error") reject(new Error(d.message));
      else resolve(maskCanvas(d.matte, d.width, d.height));
    };
    worker.addEventListener("message", onMsg);
    worker.postMessage({ type: "run", id, pixels, width, height }, [pixels.buffer]);
  });
}

const baseName = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-").slice(0, 60) || "photo";

/** State machine for /tools/background-remover. Everything happens in this tab. */
export function useBackgroundRemover() {
  const [status, setStatus] = React.useState<RemoverStatus>({ kind: "idle" });
  const [source, setSource] = React.useState<{ canvas: HTMLCanvasElement; url: string; name: string } | null>(null);
  const [subject, setSubject] = React.useState<HTMLCanvasElement | null>(null);
  const [background, setBackground] = React.useState<BackgroundChoice>({ kind: "transparent" });
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);

  const open = React.useCallback(async (file: File) => {
    setSubject(null);
    setResultUrl(null);
    try {
      const prepared = await prepareImage(file);
      const url = URL.createObjectURL(prepared.blob);
      setSource((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { canvas: prepared.canvas, url, name: baseName(file.name) };
      });
      setStatus({ kind: "model", progress: { loaded: 0, total: BG_MODEL.approxMb * 1024 * 1024 } });
      const worker = await getWorker((progress) => setStatus({ kind: "model", progress }));
      setStatus({ kind: "processing" });
      const mask = await runMatte(worker, prepared.canvas);
      setSubject(cutout(prepared.canvas, mask));
      setStatus({ kind: "done" });
    } catch (err) {
      const message = err instanceof Error && /photo|larger|JPEG/.test(err.message) ? err.message : "Something went wrong while removing the background. Please try another photo.";
      setStatus({ kind: "error", message });
    }
  }, []);

  // Re-compose the preview whenever the subject or the background changes.
  React.useEffect(() => {
    if (!source || !subject) return;
    let alive = true;
    let url: string | null = null;
    void toBlob(compose(source.canvas, subject, background), "image/png").then((blob) => {
      if (!alive) return;
      url = URL.createObjectURL(blob);
      setResultUrl(url);
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [source, subject, background]);

  const download = React.useCallback(
    async (format: "png" | "jpg") => {
      if (!source || !subject) return;
      // JPEG has no transparency: a transparent result is saved on white.
      const bg = format === "jpg" && background.kind === "transparent" ? ({ kind: "white" } as const) : background;
      const blob = await toBlob(compose(source.canvas, subject, bg), format === "png" ? "image/png" : "image/jpeg");
      saveBlob(blob, `${source.name}-no-background.${format}`);
    },
    [source, subject, background],
  );

  const reset = React.useCallback(() => {
    setSource((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return null;
    });
    setSubject(null);
    setResultUrl(null);
    setStatus({ kind: "idle" });
  }, []);

  return { status, source, resultUrl, background, setBackground, open, download, reset, ready: !!subject && !!resultUrl };
}
