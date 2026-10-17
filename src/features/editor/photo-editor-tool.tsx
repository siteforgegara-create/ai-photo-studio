"use client";

import * as React from "react";
import { RefreshCw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { prepareImage } from "@/features/selfie-check/prepare";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { CropEditor, type EditorPreset } from "./crop-editor";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

/** Base presets (as in Studio) + social sizes (03-pages §4.2). Exports at the exact pixel size. */
export const photoEditorPresets: readonly EditorPreset[] = [
  { id: "free", name: "Free" },
  { id: "1:1", name: "1:1" },
  { id: "4:5", name: "4:5" },
  { id: "16:9", name: "16:9" },
  { id: "size:400x400", name: "LinkedIn / X photo 400×400" },
  { id: "size:1584x396", name: "LinkedIn banner 1584×396" },
  { id: "size:1080x1350", name: "Instagram 1080×1350" },
  { id: "size:600x600", name: "Passport-style 600×600" },
  { id: "circle", name: "Circle" },
];

/** /tools/photo-editor — the shared editor module on a local file. Nothing is uploaded. */
export function PhotoEditorTool() {
  const [photo, setPhoto] = React.useState<{ url: string; name: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  const open = async (file: File) => {
    setError(null);
    try {
      const prepared = await prepareImage(file);
      setPhoto({ url: URL.createObjectURL(prepared.blob), name: file.name.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-").slice(0, 60) || "photo" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't open this photo.");
    }
  };

  if (!photo) {
    return (
      <div className="flex flex-col gap-3">
        <Dropzone
          title="Drop a photo here or click to upload"
          hint="JPEG, PNG, WebP or HEIC · up to 15 MB"
          accept={ACCEPT}
          multiple={false}
          icon={<SlidersHorizontal />}
          onFiles={([file]) => file && void open(file)}
          className="min-h-72"
        />
        <Privacy />
        {error && (
          <p role="alert" className="text-[14px] font-medium text-danger-text">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-3 shadow-card md:p-5">
      <CropEditor
        key={photo.url}
        src={photo.url}
        presets={photoEditorPresets}
        fileBase={`${photo.name}-edited`}
        stageClassName="h-[min(62dvh,600px)] flex-none"
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <Privacy />
        <Button variant="ghost" onClick={() => setPhoto(null)}>
          <RefreshCw aria-hidden="true" />
          Open another photo
        </Button>
      </div>
    </div>
  );
}

function Privacy() {
  return (
    <p className="flex items-start gap-2 text-[13px] leading-[18px] text-muted">
      <ShieldCheck className="mt-px size-4 shrink-0 text-success-text" aria-hidden="true" />
      Edited on this device. Your photo is never uploaded, and the saved file has no location or camera data.
    </p>
  );
}
