"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadProfilePhotoAction, type ProfileState } from "@/app/(app)/profile/actions";

const initialState: ProfileState = { ok: true };

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfileAvatarUploader({
  userName,
  photoUrl
}: {
  userName: string;
  photoUrl?: string | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [state, action, pending] = useActionState(uploadProfilePhotoAction, initialState);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const avatar = useMemo(() => initials(userName), [userName]);
  const effectiveUrl = previewUrl ?? photoUrl ?? null;

  useEffect(() => {
    if (state.ok && state.message) {
      setPreviewUrl(null);
      router.refresh();
    }
    if (!state.ok && state.message) {
      setPreviewUrl(null);
    }
  }, [state, router]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="space-y-2">
      <form ref={formRef} action={action}>
        <input
          ref={inputRef}
          name="photo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={() => {
            const file = inputRef.current?.files?.[0];
            if (!file) return;
            setPreviewUrl(URL.createObjectURL(file));
            formRef.current?.requestSubmit();
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="relative group"
          aria-label="Upload profile photo"
        >
          {effectiveUrl ? (
            <Image
              src={effectiveUrl}
              alt={userName}
              width={64}
              height={64}
              className="h-16 w-16 shrink-0 rounded-[18px] object-cover border border-white/[0.10]"
            />
          ) : (
            <div
              className="grid h-14 w-14 sm:h-16 sm:w-16 shrink-0 place-items-center rounded-[16px] sm:rounded-[18px]
                         bg-gradient-to-b from-indigo-400 to-indigo-600 text-xl font-bold text-white
                         shadow-[0_8px_24px_-8px_rgba(99,102,241,0.6)]"
            >
              {avatar}
            </div>
          )}
          <span
            className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full
                       border border-white/[0.16] bg-black/75 text-[11px] text-white/90 shadow-sm"
          >
            {pending ? "…" : "📷"}
          </span>
        </button>
      </form>
      <p className="text-[11px] text-white/45">Click avatar to upload photo</p>
      {state.message ? (
        <div
          className={[
            "rounded-[10px] border px-3 py-2 text-xs",
            state.ok
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/25 bg-rose-500/10 text-rose-200"
          ].join(" ")}
        >
          {state.message}
        </div>
      ) : null}
    </div>
  );
}

