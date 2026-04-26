"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

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
  const router = useRouter();
  const pathname = usePathname();
  const onProfilePage = pathname === "/platform/profile" || pathname.startsWith("/platform/profile/");

  const handleClick = () => {
    if (onProfilePage) {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
        return;
      }
      router.push("/platform");
      return;
    }
    router.push("/platform/profile");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="md:hidden inline-flex items-center justify-center rounded-[12px] border border-white/[0.12] bg-[#101a2d]/90 p-1.5 text-white/90"
      aria-label={onProfilePage ? "Close profile" : "Open profile"}
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
        <span className="grid h-[26px] w-[26px] place-items-center rounded-[8px] bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-[10px] font-bold text-white">
          {initials(userName)}
        </span>
      )}
    </button>
  );
}
