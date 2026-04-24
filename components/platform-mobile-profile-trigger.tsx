"use client";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function PlatformMobileProfileTrigger({ userName }: { userName: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("eduhub:open-platform-mobile-menu"))}
      className="md:hidden inline-flex items-center justify-center rounded-[12px] border border-white/[0.10] bg-white/[0.05] p-1.5 text-white/90"
      aria-label="Open menu"
    >
      <span className="grid h-[26px] w-[26px] place-items-center rounded-[8px] bg-gradient-to-b from-indigo-400 to-indigo-600 text-[10px] font-bold text-white">
        {initials(userName)}
      </span>
    </button>
  );
}
