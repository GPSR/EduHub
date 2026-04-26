import Image from "next/image";
import { clsx } from "clsx";
import Link from "next/link";

function brandTextSize(size: "sm" | "md" | "lg") {
  return size === "sm" ? "text-xl" : size === "lg" ? "text-3xl" : "text-2xl";
}

function brandLogoSize(size: "sm" | "md" | "lg") {
  return size === "sm" ? 112 : size === "lg" ? 180 : 144;
}

export function BrandLogo({
  className,
  size = "md"
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const iconSize = size === "sm" ? 40 : size === "lg" ? 60 : 48;
  return (
    <Link
      href="/"
      aria-label="Go to home"
      className={clsx(
        "group relative inline-flex items-center justify-center rounded-[28px] p-[1px]",
        "shadow-[0_28px_70px_-40px_rgba(0,0,0,0.95)]",
        "active:translate-y-[1px] transition",
        className
      )}
    >
      <span className="pointer-events-none absolute -inset-6 rounded-[32px] bg-gradient-to-b from-blue-400/30 via-cyan-300/12 to-transparent blur-2xl opacity-80 group-hover:opacity-100 transition" />
      <span className="absolute inset-0 rounded-[28px] bg-gradient-to-b from-white/12 to-white/4 opacity-70" />
      <span className="relative inline-flex items-center justify-center rounded-[27px] bg-[#111a2d]/90 backdrop-blur px-4 py-3">
        <span className="inline-flex items-center gap-3">
          <Image
            src="/brand/eduhub-icon.png"
            alt="EduHub"
            width={iconSize}
            height={iconSize}
            priority
            quality={100}
            className="rounded-2xl ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-[1.05]"
          />
          <span className={clsx("font-semibold tracking-tight", brandTextSize(size))}>EduHub</span>
        </span>
      </span>
    </Link>
  );
}

export function BrandIcon({
  className,
  size = 32,
  href = "/"
}: {
  className?: string;
  size?: number;
  href?: string;
}) {
  return (
    <Link href={href} aria-label="Go to home">
      <span className="group relative inline-flex rounded-2xl p-[1px] shadow-[0_18px_45px_-28px_rgba(0,0,0,0.9)]">
        <span className="pointer-events-none absolute -inset-3 rounded-3xl bg-gradient-to-b from-blue-400/30 via-cyan-300/12 to-transparent blur-xl opacity-70 group-hover:opacity-100 transition" />
        <span className="relative inline-flex overflow-hidden rounded-2xl border border-white/10 bg-[#111a2d]/90 p-1.5 backdrop-blur">
          <Image
            src="/brand/eduhub-icon.png"
            alt="EduHub"
            width={size}
            height={size}
            priority
            quality={100}
            className={clsx(
              "rounded-xl ring-1 ring-white/10 hover:ring-white/20 transition saturate-125 contrast-110",
              "transition-transform duration-200 group-hover:scale-[1.06]",
              className
            )}
          />
        </span>
      </span>
    </Link>
  );
}

export function BrandWordmark({
  className,
  size = "md",
  href = "/",
  priority = false
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
  priority?: boolean;
}) {
  const dimension = brandLogoSize(size);

  return (
    <Link href={href} aria-label="Go to home" className={clsx("inline-flex items-center justify-center", className)}>
      <Image
        src="/brand/eduhub-logo.png"
        alt="EduHub"
        width={dimension}
        height={dimension}
        priority={priority}
        quality={100}
        className="h-auto w-auto max-w-full drop-shadow-[0_10px_22px_rgba(0,0,0,0.35)]"
      />
    </Link>
  );
}
