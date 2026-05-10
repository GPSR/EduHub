"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";

type PreviewKind = "pdf" | "image" | "text" | "other";

function detectPreviewKind(url: string): PreviewKind {
  const lower = url.toLowerCase();
  if (lower.startsWith("data:application/pdf")) return "pdf";
  if (lower.startsWith("data:image/")) return "image";
  if (lower.startsWith("data:text/")) return "text";

  const pathname = lower.split("?")[0] ?? lower;
  if (pathname.endsWith(".pdf")) return "pdf";
  if (/\.(png|jpg|jpeg|webp|gif|bmp|heic|heif|svg)$/i.test(pathname)) return "image";
  if (/\.(txt|csv|rtf|md|json)$/i.test(pathname)) return "text";
  return "other";
}

function guessFileName(url: string) {
  const clean = (url.split("?")[0] ?? "").trim();
  if (!clean) return "question-file";
  const segments = clean.split("/");
  return segments[segments.length - 1] || "question-file";
}

export function ExamQuestionFilePreview({
  fileUrl,
  title = "Question File Preview",
  buttonText = "Open Question File"
}: {
  fileUrl: string;
  title?: string;
  buttonText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loadingText, setLoadingText] = useState(false);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const previewKind = useMemo(() => detectPreviewKind(fileUrl), [fileUrl]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || previewKind !== "text") return;
    let canceled = false;
    setLoadingText(true);
    setTextPreview(null);

    fetch(fileUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load file (${response.status})`);
        return response.text();
      })
      .then((text) => {
        if (canceled) return;
        setTextPreview(text.slice(0, 20000));
      })
      .catch(() => {
        if (canceled) return;
        setTextPreview(null);
      })
      .finally(() => {
        if (!canceled) setLoadingText(false);
      });

    return () => {
      canceled = true;
    };
  }, [fileUrl, open, previewKind]);

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {buttonText}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[620] flex items-end sm:items-center justify-center bg-[#020814]/96 p-0 sm:p-5" role="dialog" aria-modal="true" aria-label={title}>
          <div className="absolute inset-0" onClick={() => setOpen(false)} />

          <div className="relative w-full max-w-[980px] overflow-hidden rounded-t-[24px] sm:rounded-[24px] border border-white/[0.12] bg-[#07101f] shadow-[0_35px_90px_-45px_rgba(0,0,0,0.95)]">
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-4 py-3 sm:px-5">
              <div>
                <h3 className="text-[15px] font-semibold text-white/92">{title}</h3>
                <p className="text-[11px] text-white/50">{guessFileName(fileUrl)}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/[0.16] bg-[#0d172b] text-white/75 hover:text-white"
                aria-label="Close question preview"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[80vh] overflow-auto p-2.5 sm:p-3.5">
              {previewKind === "pdf" ? (
                <iframe
                  src={fileUrl}
                  title={title}
                  className="h-[74vh] min-h-[360px] w-full rounded-[12px] border border-white/[0.1] bg-[#0f1728]"
                />
              ) : null}

              {previewKind === "image" ? (
                <div className="rounded-[12px] border border-white/[0.1] bg-black/20 p-2">
                  <img src={fileUrl} alt="Question file preview" className="max-h-[72vh] w-full rounded-[10px] object-contain" />
                </div>
              ) : null}

              {previewKind === "text" ? (
                <div className="rounded-[12px] border border-white/[0.1] bg-black/20 p-3">
                  {loadingText ? (
                    <div className="flex items-center gap-2 py-10 text-sm text-white/65">
                      <span className="h-4 w-4 rounded-full border-2 border-white/25 border-t-white/80 animate-spin" />
                      Loading preview...
                    </div>
                  ) : textPreview ? (
                    <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap text-xs text-white/82">{textPreview}</pre>
                  ) : (
                    <div className="text-sm text-white/65">Could not render text preview.</div>
                  )}
                </div>
              ) : null}

              {previewKind === "other" ? (
                <iframe
                  src={fileUrl}
                  title={title}
                  className="h-[74vh] min-h-[360px] w-full rounded-[12px] border border-white/[0.1] bg-[#0f1728]"
                />
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/[0.08] px-4 py-3 sm:px-5">
              <a
                href={fileUrl}
                download
                className="inline-flex min-h-[36px] items-center justify-center rounded-[10px] border border-sky-400/35 bg-sky-500/[0.12] px-3 text-xs font-semibold text-sky-200 hover:bg-sky-500/[0.2]"
              >
                Download
              </a>
              <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
