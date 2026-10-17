"use client";

import * as React from "react";
import {
  centeredCrop,
  commit,
  createHistory,
  initialEditorState,
  presetAspect,
  redo,
  rotatedSize,
  undo,
  type CropPresetId,
  type EditorState,
  type History,
} from "./engine";

/** Loads an image URL into an ImageBitmap (same-origin or blob:). */
export function useBitmap(src: string | null) {
  const [bitmap, setBitmap] = React.useState<ImageBitmap | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!src) return;
    let alive = true;
    let created: ImageBitmap | null = null;
    void (async () => {
      try {
        const res = await fetch(src);
        const bmp = await createImageBitmap(await res.blob(), { imageOrientation: "from-image" });
        if (!alive) return bmp.close();
        created = bmp;
        setBitmap(bmp);
        setError(null);
      } catch {
        if (alive) setError("We couldn't open this image.");
      }
    })();
    return () => {
      alive = false;
      created?.close();
    };
  }, [src]);
  return { bitmap: src ? bitmap : null, error };
}

/**
 * Editor state with Undo/Redo. `live` changes (dragging the crop box, moving a
 * slider) update the view without filling the history; `commit` records a step.
 */
export function useEditor(bitmap: ImageBitmap | null) {
  const [history, setHistory] = React.useState<History>(() => createHistory());
  const [live, setLive] = React.useState<EditorState | null>(null);
  const state = live ?? history.present;

  const frame = bitmap ? rotatedSize(bitmap.width, bitmap.height, state.rotate) : { width: 1, height: 1 };

  const commitState = React.useCallback((next: EditorState) => {
    setLive(null);
    setHistory((h) => commit(h, next));
  }, []);

  const api = React.useMemo(
    () => ({
      preview: (next: EditorState) => setLive(next),
      commit: commitState,
      cancelPreview: () => setLive(null),
      undo: () => {
        setLive(null);
        setHistory((h) => undo(h));
      },
      redo: () => {
        setLive(null);
        setHistory((h) => redo(h));
      },
      reset: () => {
        setLive(null);
        setHistory((h) => commit(h, initialEditorState));
      },
    }),
    [commitState],
  );

  const setPreset = React.useCallback(
    (preset: CropPresetId) => {
      if (!bitmap) return;
      const f = rotatedSize(bitmap.width, bitmap.height, history.present.rotate);
      commitState({ ...history.present, preset, crop: centeredCrop(f.width, f.height, presetAspect(preset)) });
    },
    [bitmap, history.present, commitState],
  );

  const rotate90 = React.useCallback(
    (dir: 1 | -1) => {
      if (!bitmap) return;
      const s = history.present;
      const rotate = (((s.rotate + dir * 90) % 360) + 360) % 360 as EditorState["rotate"];
      const f = rotatedSize(bitmap.width, bitmap.height, rotate);
      commitState({ ...s, rotate, crop: centeredCrop(f.width, f.height, presetAspect(s.preset)) });
    },
    [bitmap, history.present, commitState],
  );

  return {
    state,
    committed: history.present,
    frame,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    setPreset,
    rotate90,
    ...api,
  };
}

export type EditorApi = ReturnType<typeof useEditor>;
