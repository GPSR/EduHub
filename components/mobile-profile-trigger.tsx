"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

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
  const router = useRouter();
  const pathname = usePathname();
  const onProfilePage = pathname === "/profile" || pathname.startsWith("/profile/");

  const handleClick = () => {
    if (onProfilePage) {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
        return;
      }
      router.push("/dashboard");
      return;
    }
    router.push("/profile");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center justify-center rounded-[12px] border border-white/[0.12] bg-[#101a2d]/90 p-1.5 text-white/90"
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
          {avatar}
        </span>
      )}
    </button>
  );
}
