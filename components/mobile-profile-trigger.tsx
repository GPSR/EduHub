"use client";

import Image from "next/image";
import Link from "next/link";

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
    <Link
      href="/profile"
      className="md:hidden inline-flex items-center justify-center rounded-[12px] border border-white/[0.10] bg-white/[0.05] p-1.5 text-white/90"
      aria-label="Open profile"
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
    </Link>
  );
}
