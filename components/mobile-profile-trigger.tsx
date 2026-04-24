"use client";

import Image from "next/image";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase();
}

export function MobileProfileTrigger({
  userName,
  photoUrl
}: {
  userName: string;
  photoUrl?: string;
}) {
  const avatar = initials(userName);

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("eduhub:open-mobile-menu"))}
      className="md:hidden inline-flex items-center gap-2 rounded-[12px] border border-white/[0.10] bg-white/[0.05] px-2.5 py-1.5 text-white/90"
      aria-label="Open mobile menu"
    >
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={userName}
          width={26}
          height={26}
          className="h-[26px] w-[26px] rounded-[8px] object-cover border border-white/[0.12]"
        />
      ) : (
        <span className="grid h-[26px] w-[26px] place-items-center rounded-[8px] bg-gradient-to-b from-indigo-400 to-indigo-600 text-[10px] font-bold text-white">
          {avatar}
        </span>
      )}
      <span className="text-[11px] font-semibold text-white/75">Profile</span>
    </button>
  );
}
