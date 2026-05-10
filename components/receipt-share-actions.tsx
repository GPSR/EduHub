"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";

type ShareState = "idle" | "shared" | "copied" | "printed" | "error";

function buildAbsoluteUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

export function ReceiptShareActions({
  receiptPath,
  receiptTitle,
  studentName
}: {
  receiptPath: string;
  receiptTitle: string;
  studentName: string;
}) {
  const [shareState, setShareState] = useState<ShareState>("idle");
  const absoluteUrl = useMemo(() => buildAbsoluteUrl(receiptPath), [receiptPath]);
  const shareText = `Payment receipt for ${studentName} - ${receiptTitle}`;

  async function handleShare() {
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    };

    if (typeof nav.share === "function") {
      try {
        await nav.share({
          title: "EduHub Payment Receipt",
          text: shareText,
          url: absoluteUrl
        });
        setShareState("shared");
        setTimeout(() => setShareState("idle"), 1500);
        return;
      } catch {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 1500);
    } catch {
      setShareState("error");
      setTimeout(() => setShareState("idle"), 1500);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 1500);
    } catch {
      setShareState("error");
      setTimeout(() => setShareState("idle"), 1500);
    }
  }

  function handlePrint() {
    window.print();
    setShareState("printed");
    setTimeout(() => setShareState("idle"), 1500);
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button type="button" size="sm" variant="secondary" onClick={handleShare}>
        {shareState === "shared" ? "Shared" : shareState === "copied" ? "Copied" : "Share receipt"}
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={handleCopy}>
        {shareState === "copied" ? "Copied" : "Copy link"}
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={handlePrint}>
        {shareState === "printed" ? "Opened" : "Print"}
      </Button>
      {shareState === "error" ? <span className="text-[11px] text-rose-200/80">Unable to copy link</span> : null}
    </div>
  );
}
