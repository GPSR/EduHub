"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type TouchEvent } from "react";

type SlideItem = {
  id: string;
  title: string;
  caption: string | null;
  imageUrl: string;
  by: string;
};

const SWIPE_THRESHOLD_PX = 40;

function DownloadIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 4v9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 10.5 12 14l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 18.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ShareIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M14.5 5.5h4v4M13.5 10.5l5-5M8.25 13.25l7.5-2M8.25 13.25l7.5 2M8 13.25a2.75 2.75 0 1 1-5.5 0 2.75 2.75 0 0 1 5.5 0Zm13.5-7.75a2.75 2.75 0 1 1-5.5 0 2.75 2.75 0 0 1 5.5 0Zm0 15.5a2.75 2.75 0 1 1-5.5 0 2.75 2.75 0 0 1 5.5 0Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function sanitizeDownloadName(title: string) {
  const normalized = title.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
  return normalized.length ? normalized : "gallery-image";
}

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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fullViewOpen, setFullViewOpen] = useState(false);
  const swipeStartMainRef = useRef<number | null>(null);
  const swipeStartFullViewRef = useRef<number | null>(null);

  const active = items[index] ?? items[0];
  const pageUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/gallery?folderId=${encodeURIComponent(folderId)}`;
  }, [folderId]);

  useEffect(() => {
    setIndex(0);
    setFeedback(null);
    setFullViewOpen(false);
  }, [folderId, items.length]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!fullViewOpen) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullViewOpen(false);
      if (event.key === "ArrowLeft") setIndex((current) => (current - 1 + items.length) % items.length);
      if (event.key === "ArrowRight") setIndex((current) => (current + 1) % items.length);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [fullViewOpen, items.length]);

  if (!active) return null;

  const onPrev = () => setIndex((current) => (current - 1 + items.length) % items.length);
  const onNext = () => setIndex((current) => (current + 1) % items.length);

  const startSwipe = (event: TouchEvent<HTMLElement>, ref: MutableRefObject<number | null>) => {
    ref.current = event.changedTouches[0]?.clientX ?? null;
  };

  const endSwipe = (event: TouchEvent<HTMLElement>, ref: MutableRefObject<number | null>) => {
    const start = ref.current;
    const end = event.changedTouches[0]?.clientX ?? null;
    ref.current = null;
    if (start === null || end === null) return;
    const delta = end - start;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta > 0) onPrev();
    else onNext();
  };

  const onShare = async () => {
    try {
      const nav = typeof window !== "undefined" ? window.navigator : null;
      if (nav && typeof nav.share === "function") {
        await nav.share({
          title: `${folderName} · ${active.title}`,
          text: active.caption ?? `Gallery photo from ${folderName}`,
          url: active.imageUrl || pageUrl || undefined
        });
        setFeedback("Shared");
        return;
      }
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(active.imageUrl || pageUrl);
        setFeedback("Link copied");
        return;
      }
      setFeedback("Share not available");
    } catch {
      setFeedback("Share cancelled");
    }
  };

  return (
    <>
      <div className="space-y-2.5">
        <div className="overflow-hidden rounded-[16px] border border-white/[0.12] bg-[#081124]">
          <button
            type="button"
            onClick={() => setFullViewOpen(true)}
            onTouchStart={(event) => startSwipe(event, swipeStartMainRef)}
            onTouchEnd={(event) => endSwipe(event, swipeStartMainRef)}
            className="group relative block w-full text-left"
            aria-label={`Open full view for ${active.title}`}
          >
            <div className="relative aspect-[16/9] md:aspect-[20/9]">
              <Image
                src={active.imageUrl}
                alt={active.title}
                fill
                sizes="(min-width: 1024px) 80vw, (min-width: 640px) 94vw, 96vw"
                className="object-cover"
                priority
              />

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/68 via-black/18 to-transparent" />

              <div className="absolute right-3 top-3 rounded-full border border-white/25 bg-black/38 px-2.5 py-1 text-[11px] font-semibold text-white/95 backdrop-blur">
                Tap for full view
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white/95">{active.title}</p>
                  {active.caption ? <p className="line-clamp-2 text-xs text-white/75">{active.caption}</p> : null}
                  <p className="mt-1 text-[11px] text-white/55">By {active.by}</p>
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-white/45">Swipe left or right to move photos</div>
          <div className="text-[11px] text-white/45">Tap image for full view</div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setIndex(itemIndex);
                setFullViewOpen(true);
              }}
              className={[
                "relative h-12 w-[72px] shrink-0 overflow-hidden rounded-[10px] border transition",
                itemIndex === index
                  ? "border-blue-300/70 ring-2 ring-blue-400/35"
                  : "border-white/[0.18] opacity-75 hover:opacity-100"
              ].join(" ")}
              aria-label={`Open ${item.title}`}
            >
              <Image src={item.imageUrl} alt={item.title} fill sizes="72px" className="object-cover" />
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end text-[11px] text-white/45">
          {feedback ? <span className="text-white/65">{feedback}</span> : null}
        </div>
      </div>

      {fullViewOpen ? (
        <div className="fixed inset-0 z-[260] bg-[#02060f]/96 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close full image view"
            onClick={() => setFullViewOpen(false)}
            className="absolute inset-0"
          />
          <div
            className="relative h-full w-full"
            onTouchStart={(event) => startSwipe(event, swipeStartFullViewRef)}
            onTouchEnd={(event) => endSwipe(event, swipeStartFullViewRef)}
          >
            <Image
              src={active.imageUrl}
              alt={active.title}
              fill
              sizes="100vw"
              className="object-contain object-center"
              priority
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent" />

            <div className="absolute right-3 top-[max(0.55rem,env(safe-area-inset-top))] flex items-center gap-2">
              <a
                href={active.imageUrl}
                download={`${sanitizeDownloadName(active.title)}.jpg`}
                title="Download image"
                aria-label="Download image"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-500/20 text-emerald-100 backdrop-blur transition hover:bg-emerald-500/30"
              >
                <DownloadIcon className="h-[18px] w-[18px]" />
              </a>
              <button
                type="button"
                onClick={onShare}
                title="Share image"
                aria-label="Share image"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-300/35 bg-blue-500/20 text-blue-100 backdrop-blur transition hover:bg-blue-500/30"
              >
                <ShareIcon className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => setFullViewOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.2] bg-black/45 text-white/90 backdrop-blur transition hover:bg-black/60"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="pointer-events-none absolute bottom-[max(0.6rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/45 px-3 py-1 text-[11px] font-medium text-white/82 backdrop-blur">
              Swipe left or right
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
