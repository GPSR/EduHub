"use client";

import { useState } from "react";
import { Label, Textarea } from "@/components/ui";

export function ParentAddressField({
  studentAddress,
  parentAddress
}: {
  studentAddress?: string | null;
  parentAddress?: string | null;
}) {
  const initialSame = !parentAddress || (studentAddress && parentAddress.trim() === studentAddress.trim()) ? true : false;
  const [sameAsStudent, setSameAsStudent] = useState(initialSame);

  return (
    <div className="md:col-span-2 space-y-2">
      <label className="flex items-center gap-2 text-sm text-white/80">
        <input
          type="checkbox"
          name="parentAddressSameAsStudent"
          value="1"
          defaultChecked={initialSame}
          onChange={(e) => setSameAsStudent(e.target.checked)}
          className="h-4 w-4 accent-indigo-500"
        />
        Same as student address
      </label>

      {sameAsStudent ? (
        <div className="rounded-[10px] border border-white/[0.10] bg-white/[0.03] px-3 py-2 text-[12px] text-white/65">
          {studentAddress?.trim() ? studentAddress : "Student address will be reused."}
        </div>
      ) : (
        <div>
          <Label>Parent address</Label>
          <Textarea name="parentAddress" rows={2} defaultValue={parentAddress ?? ""} />
        </div>
      )}
    </div>
  );
}
