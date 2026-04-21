"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { ImpersonateRoleModal } from "@/components/impersonate-role-modal";

export function ImpersonateLauncher({
  schoolId,
  schoolName
}: {
  schoolId: string;
  schoolName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Go to school
      </Button>
      <ImpersonateRoleModal
        open={open}
        onClose={() => setOpen(false)}
        schoolId={schoolId}
        schoolName={schoolName}
      />
    </>
  );
}

