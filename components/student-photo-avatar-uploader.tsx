"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImageCropperDialog } from "@/components/image-cropper-dialog";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function StudentPhotoAvatarUploader({
  action,
  studentId,
  studentName,
  photoUrl,
  returnTo,
}: {
  action: (formData: FormData) => void | Promise<void>;
  studentId: string;
  studentName: string;
  photoUrl?: string | null;
  returnTo: string;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const avatar = initials(studentName);

  return (
    <>
      <form ref={formRef} action={action} className="contents">
        <input type="hidden" name="id" value={studentId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <input
          ref={inputRef}
          name="photo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (!file) return;
            setCropFile(file);
            setCropOpen(true);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[18px] border border-white/[0.12] bg-white/[0.04] transition hover:border-white/[0.22]"
          aria-label="Upload student photo"
        >
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={studentName}
              width={64}
              height={64}
              className="h-16 w-16 object-cover"
            />
          ) : (
            <div className="grid h-16 w-16 place-items-center bg-gradient-to-b from-indigo-400 to-indigo-600 text-xl font-bold text-white shadow-lg">
              {avatar}
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.16] bg-black/75 text-[11px] text-white/90 shadow-sm">
            📷
          </span>
        </button>
      </form>

      <ImageCropperDialog
        open={cropOpen}
        file={cropFile}
        onCancel={() => {
          setCropOpen(false);
          setCropFile(null);
          if (inputRef.current) inputRef.current.value = "";
        }}
        onApply={(croppedFile) => {
          if (!inputRef.current) return;
          const dt = new DataTransfer();
          dt.items.add(croppedFile);
          inputRef.current.files = dt.files;
          setCropOpen(false);
          setCropFile(null);
          formRef.current?.requestSubmit();
        }}
      />
    </>
  );
}
