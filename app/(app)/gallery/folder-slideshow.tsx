"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type SlideItem = {
  id: string;
  title: string;
  caption: string | null;
  imageUrl: string;
  by: string;
};

export function FolderSlideshow({
  folderId,
  folderName,
  items
}: {
  folderId: string;
  folderName: string;
  items: SlideItem[];
}) {
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(items.length > 1);
  const [feedback, setFeedback] = useState<string | null>(null);

  const active = items[index] ?? items[0];

  const pageUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/gallery?folderId=${encodeURIComponent(folderId)}`;
  }, [folderId]);

  useEffect(() => {
    setIndex(0);
    setAutoPlay(items.length > 1);
    setFeedback(null);
  }, [folderId, items.length]);

  useEffect(() => {
    if (!autoPlay || items.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, 3400);
    return () => window.clearInterval(timer);
  }, [autoPlay, items.length]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  if (!active) return null;

  const onPrev = () => setIndex((current) => (current - 1 + items.length) % items.length);
  const onNext = () => setIndex((current) => (current + 1) % items.length);

  const onShare = async () => {
    try {
      const nav = typeof window !== "undefined" ? window.navigator : null;
      if (nav && typeof nav.share === "function") {
        await nav.share({
          title: `${folderName} · ${active.title}`,
          text: active.caption ?? `Gallery photo from ${folderName}`,
          url: pageUrl || undefined
        });
        setFeedback("Shared");
        return;
      }
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(pageUrl || active.imageUrl);
        setFeedback("Share link copied");
        return;
      }
      setFeedback("Share not available");
    } catch {
      setFeedback("Share cancelled");
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-[18px] border border-white/[0.12] bg-[#081124]">
        <div className="relative aspect-[16/10] sm:aspect-[16/9] md:aspect-[21/9]">
          <Image
            src={active.imageUrl}
            alt={active.title}
            fill
            sizes="(min-width: 1024px) 80vw, (min-width: 640px) 94vw, 96vw"
            className="object-cover"
            priority
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

          {items.length > 1 ? (
            <>
              <button
                type="button"
                onClick={onPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-black/35 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-black/55"
                aria-label="Previous image"
              >
                ←
              </button>
              <button
                type="button"
                onClick={onNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-black/35 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-black/55"
                aria-label="Next image"
              >
                →
              </button>
            </>
          ) : null}

          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white/95">{active.title}</p>
                {active.caption ? <p className="line-clamp-2 text-xs text-white/75">{active.caption}</p> : null}
                <p className="mt-1 text-[11px] text-white/55">By {active.by}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {items.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setAutoPlay((value) => !value)}
                    className="rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white/90 hover:bg-black/55"
                  >
                    {autoPlay ? "Pause" : "Play"}
                  </button>
                ) : null}
                <a
                  href={active.imageUrl}
                  download={`${active.title.replace(/\s+/g, "-").toLowerCase()}.png`}
                  className="rounded-full border border-emerald-300/35 bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/30"
                >
                  Save
                </a>
                <button
                  type="button"
                  onClick={onShare}
                  className="rounded-full border border-blue-300/35 bg-blue-500/20 px-2.5 py-1 text-[11px] font-semibold text-blue-100 hover:bg-blue-500/30"
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, itemIndex) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setIndex(itemIndex)}
            className={[
              "relative h-16 w-24 shrink-0 overflow-hidden rounded-[10px] border transition",
              itemIndex === index
                ? "border-blue-300/70 ring-2 ring-blue-400/35"
                : "border-white/[0.18] opacity-75 hover:opacity-100"
            ].join(" ")}
            aria-label={`Open ${item.title}`}
          >
            <Image src={item.imageUrl} alt={item.title} fill sizes="96px" className="object-cover" />
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-white/45">
        <span>
          {index + 1} / {items.length}
        </span>
        {feedback ? <span className="text-white/65">{feedback}</span> : <span>Folder slideshow</span>}
      </div>
    </div>
  );
}
