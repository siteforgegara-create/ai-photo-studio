"use client";

import * as React from "react";
import { ChevronDown, Download } from "lucide-react";
import { brand } from "@/config/brand";
import { downloadFormats } from "@/config/edit-tools";
import { formatSpecs, type DownloadFormatId } from "@/features/crop/crop-math";
import { renderFormat, saveBlob } from "@/features/crop/render";
import { shootsService, type ShootPhoto } from "@/services";
import { Button, type ButtonProps } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const slug = brand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export function fileName(photo: ShootPhoto, format: DownloadFormatId) {
  const ext = formatSpecs[format].mime === "image/png" ? "png" : "jpg";
  return `${slug}-${photo.id}-${formatSpecs[format].suffix}.${ext}`;
}

/**
 * Downloads one photo in a given format. Crops are rendered in the browser
 * (canvas, face-centred). Only full-size downloads are recorded — they end
 * refund eligibility (M6).
 */
export async function downloadPhoto(photo: ShootPhoto, format: DownloadFormatId, onRecorded?: () => void) {
  const blob = await renderFormat(photo.url, format);
  saveBlob(blob, fileName(photo, format));
  if (formatSpecs[format].fullSize) {
    await shootsService.download([photo.id], "original");
    onRecorded?.();
  }
}

/** `Download ▾` with the five formats (06-shoot-flow §2). */
export function DownloadMenu({ photo, onRecorded, variant = "secondary", align = "start" }: { photo: ShootPhoto; onRecorded?: () => void; variant?: ButtonProps["variant"]; align?: "start" | "center" | "end" }) {
  const [busy, setBusy] = React.useState<DownloadFormatId | null>(null);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} loading={busy !== null}>
          {busy === null && <Download aria-hidden="true" />}
          Download
          <ChevronDown aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side="top" className="w-64">
        <DropdownMenuLabel>Download as</DropdownMenuLabel>
        {downloadFormats.map((f) => (
          <DropdownMenuItem
            key={f.id}
            onSelect={async () => {
              setBusy(f.id);
              try {
                await downloadPhoto(photo, f.id, onRecorded);
              } finally {
                setBusy(null);
              }
            }}
          >
            {f.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
