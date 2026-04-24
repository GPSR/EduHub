"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";

type ImageCropperDialogProps = {
  open: boolean;
  file: File | null;
  title?: string;
  onCancel: () => void;
  onApply: (file: File) => void | Promise<void>;
  outputSize?: number;
};

const PREVIEW_SIZE = 320;

function outputMimeFor(file: File) {
  if (file.type === "image/png") return "image/png";
  if (file.type === "image/webp") return "image/webp";
  return "image/jpeg";
}

function extForMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

async function loadImage(src: string) {
  const img = new Image();
  img.src = src;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Unable to read image."));
  });
  return img;
}

async function buildCroppedFile(args: {
  file: File;
  zoom: number;
  offsetX: number;
  offsetY: number;
  previewSize: number;
  outputSize: number;
}) {
  const { file, zoom, offsetX, offsetY, previewSize, outputSize } = args;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Unable to prepare image.");

    const baseScale = Math.max(previewSize / img.naturalWidth, previewSize / img.naturalHeight);
    const drawWidth = img.naturalWidth * baseScale * zoom;
    const drawHeight = img.naturalHeight * baseScale * zoom;
    const maxOffsetX = Math.max(0, (drawWidth - previewSize) / 2);
    const maxOffsetY = Math.max(0, (drawHeight - previewSize) / 2);
    const safeOffsetX = clamp(offsetX, -maxOffsetX, maxOffsetX);
    const safeOffsetY = clamp(offsetY, -maxOffsetY, maxOffsetY);
    const drawX = previewSize / 2 - drawWidth / 2 + safeOffsetX;
    const drawY = previewSize / 2 - drawHeight / 2 + safeOffsetY;
    const scaleToOutput = outputSize / previewSize;

    ctx.clearRect(0, 0, outputSize, outputSize);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      img,
      drawX * scaleToOutput,
      drawY * scaleToOutput,
      drawWidth * scaleToOutput,
      drawHeight * scaleToOutput
    );

    const mime = outputMimeFor(file);
    const blob = await new Promise<Blob | null>((resolve) => {
      ctx.canvas.toBlob(resolve, mime, mime === "image/jpeg" ? 0.92 : undefined);
    });
    if (!blob) throw new Error("Unable to crop image.");

    const ext = extForMime(blob.type);
    return new File([blob], `${baseName(file.name)}-cropped.${ext}`, { type: blob.type });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ImageCropperDialog({
  open,
  file,
  title = "Crop Photo",
  onCancel,
  onApply,
  outputSize = 1024,
}: ImageCropperDialogProps) {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !file) {
      setSourceUrl(null);
      setImageSize(null);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setError(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setError(null);

    const img = new Image();
    img.src = url;
    img.onload = () => setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => setImageSize(null);

    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const oldHtmlOverflow = html.style.overflow;
    const oldBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = oldHtmlOverflow;
      body.style.overflow = oldBodyOverflow;
    };
  }, [open]);

  const bounds = useMemo(() => {
    if (!imageSize) return { maxOffsetX: 0, maxOffsetY: 0 };
    const baseScale = Math.max(PREVIEW_SIZE / imageSize.width, PREVIEW_SIZE / imageSize.height);
    const drawWidth = imageSize.width * baseScale * zoom;
    const drawHeight = imageSize.height * baseScale * zoom;
    return {
      maxOffsetX: Math.max(0, (drawWidth - PREVIEW_SIZE) / 2),
      maxOffsetY: Math.max(0, (drawHeight - PREVIEW_SIZE) / 2),
    };
  }, [imageSize, zoom]);

  useEffect(() => {
    setOffsetX((current) => clamp(current, -bounds.maxOffsetX, bounds.maxOffsetX));
    setOffsetY((current) => clamp(current, -bounds.maxOffsetY, bounds.maxOffsetY));
  }, [bounds.maxOffsetX, bounds.maxOffsetY]);

  if (!open || !file) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close crop dialog"
        onClick={() => !busy && onCancel()}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-[560px] rounded-[20px] border border-white/[0.14] bg-[#0f1728]/95 p-4 sm:p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm sm:text-base font-semibold text-white/95">{title}</h3>
          <p className="text-[11px] text-white/45">Square crop</p>
        </div>

        <div className="mx-auto w-full max-w-[360px]">
          <div className="relative mx-auto overflow-hidden rounded-[16px] border border-white/[0.14] bg-black/30" style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}>
            {sourceUrl ? (
              <img
                src={sourceUrl}
                alt="Crop preview"
                className="h-full w-full object-cover select-none"
                draggable={false}
                style={{
                  transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
                  transformOrigin: "center center",
                }}
              />
            ) : null}
            <div className="pointer-events-none absolute inset-0 border-[2px] border-white/60" />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-white/45">
              Zoom
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-blue-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-white/45">
              Horizontal
            </label>
            <input
              type="range"
              min={-Math.round(bounds.maxOffsetX)}
              max={Math.round(bounds.maxOffsetX)}
              step={1}
              value={offsetX}
              onChange={(e) => setOffsetX(Number(e.target.value))}
              disabled={bounds.maxOffsetX <= 0}
              className="w-full accent-blue-400 disabled:opacity-40"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-white/45">
              Vertical
            </label>
            <input
              type="range"
              min={-Math.round(bounds.maxOffsetY)}
              max={Math.round(bounds.maxOffsetY)}
              step={1}
              value={offsetY}
              onChange={(e) => setOffsetY(Number(e.target.value))}
              disabled={bounds.maxOffsetY <= 0}
              className="w-full accent-blue-400 disabled:opacity-40"
            />
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-[10px] border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => !busy && onCancel()}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={async () => {
              if (!file || busy) return;
              setBusy(true);
              setError(null);
              try {
                const cropped = await buildCroppedFile({
                  file,
                  zoom,
                  offsetX,
                  offsetY,
                  previewSize: PREVIEW_SIZE,
                  outputSize,
                });
                await onApply(cropped);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Unable to crop image.");
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
          >
            {busy ? "Processing..." : "Use Cropped Photo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
