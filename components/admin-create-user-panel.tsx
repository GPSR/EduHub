"use client";

import { useState } from "react";
import { Card, Button } from "@/components/ui";
import { AdminCreateUserForm } from "@/components/admin-create-user-form";

type ClassOption = { id: string; label: string };
type StudentOption = { id: string; fullName: string };
type RoleOption = { id: string; key: string; name: string };
type ModuleOption = { id: string; key: string; name: string };

export function AdminCreateUserPanel({
  roles,
  modules,
  classes,
  students
}: {
  roles: RoleOption[];
  modules: ModuleOption[];
  classes: ClassOption[];
  students: StudentOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card title="Create User">
      {!open ? (
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-white/60">Add a new teacher/parent/user.</div>
          <Button type="button" onClick={() => setOpen(true)}>
            + Create
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-white/60">Fill details and create the user.</div>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
          <AdminCreateUserForm roles={roles} modules={modules} classes={classes} students={students} />
        </div>
      )}
    </Card>
  );
}

