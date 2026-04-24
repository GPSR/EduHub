"use client";

import Image from "next/image";
import Link from "next/link";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function PlatformMobileProfileTrigger({
  userName,
  photoUrl
}: {
  userName: string;
  photoUrl?: string | null;
}) {
  return (
    <Link
      href="/platform/profile"
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
          {initials(userName)}
        </span>
      )}
    </Link>
  );
}
