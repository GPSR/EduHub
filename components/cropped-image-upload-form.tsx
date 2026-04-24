"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";
import { ImageCropperDialog } from "@/components/image-cropper-dialog";

type HiddenField = {
  name: string;
  value: string;
};

export function CroppedImageUploadForm({
  action,
  fileFieldName = "photo",
  hiddenFields = [],
  accept = "image/png,image/jpeg,image/webp",
  triggerLabel = "Choose & Crop Photo",
  helperText,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  fileFieldName?: string;
  hiddenFields?: HiddenField[];
  accept?: string;
  triggerLabel?: string;
  helperText?: string;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const pickInputRef = useRef<HTMLInputElement | null>(null);
  const submitInputRef = useRef<HTMLInputElement | null>(null);

  const [openCrop, setOpenCrop] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");

  return (
    <>
      <form ref={formRef} action={action} className={className ?? "space-y-2"}>
        {hiddenFields.map((field) => (
          <input key={field.name} type="hidden" name={field.name} value={field.value} />
        ))}

        <input
          ref={pickInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (!file) return;
            setSelectedFile(file);
            setOpenCrop(true);
            event.currentTarget.value = "";
          }}
        />
        <input ref={submitInputRef} name={fileFieldName} type="file" className="hidden" />

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => pickInputRef.current?.click()}>
            {triggerLabel}
          </Button>
          {selectedName ? (
            <span className="text-[11px] text-white/45">Selected: {selectedName}</span>
          ) : null}
        </div>

        {helperText ? <p className="text-[11px] text-white/35">{helperText}</p> : null}
      </form>

      <ImageCropperDialog
        open={openCrop}
        file={selectedFile}
        onCancel={() => {
          setOpenCrop(false);
          setSelectedFile(null);
        }}
        onApply={(croppedFile) => {
          if (!submitInputRef.current) return;
          const dt = new DataTransfer();
          dt.items.add(croppedFile);
          submitInputRef.current.files = dt.files;
          setSelectedName(croppedFile.name);
          setOpenCrop(false);
          setSelectedFile(null);
          formRef.current?.requestSubmit();
        }}
      />
    </>
  );
}
