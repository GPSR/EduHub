"use client";

import { useState } from "react";
import { Card, Button } from "@/components/ui";
import { AdminCreateUserForm } from "@/components/admin-create-user-form";

type ClassOption   = { id: string; label: string };
type StudentOption = { id: string; fullName: string; classId: string | null };
type RoleOption    = { id: string; key: string; name: string };
type ModuleOption  = { id: string; key: string; name: string };

export function AdminCreateUserPanel({ roles, modules, classes, students }: {
  roles: RoleOption[]; modules: ModuleOption[];
  classes: ClassOption[]; students: StudentOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card
      title={open ? "New User" : undefined}
      description={open ? "Fill in the details to create a new user account." : undefined}
      accent={open ? "indigo" : undefined}
    >
      {!open ? (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-semibold text-white/85">Create a new user</p>
            <p className="text-sm text-white/45 mt-0.5">Add a teacher, parent, or custom-role user.</p>
          </div>
          <Button onClick={() => setOpen(true)}>+ New user</Button>
        </div>
      ) : (
        <div>
          <div className="flex justify-end mb-4">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>✕ Close</Button>
          </div>
          <AdminCreateUserForm roles={roles} modules={modules} classes={classes} students={students} />
        </div>
      )}
    </Card>
  );
}
