"use client";

import { useActionState, useMemo, useState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import { createUserAction, type CreateUserState } from "@/app/(app)/admin/users/actions";

const initialState: CreateUserState = { ok: true };

type ClassOption = { id: string; label: string };
type StudentOption = { id: string; fullName: string };
type RoleOption = { id: string; key: string; name: string };
type ModuleOption = { id: string; key: string; name: string };

export function AdminCreateUserForm({
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
  const [state, action, pending] = useActionState(createUserAction, initialState);
  const defaultRoleId = roles.find((r) => r.key === "TEACHER")?.id ?? roles[0]?.id ?? "";
  const [schoolRoleId, setSchoolRoleId] = useState<string>(defaultRoleId);
  const roleKey = useMemo(() => roles.find((r) => r.id === schoolRoleId)?.key ?? "", [roles, schoolRoleId]);

  const showTeacherMapping = roleKey === "TEACHER" || roleKey === "CLASS_TEACHER";
  const isClassTeacher = roleKey === "CLASS_TEACHER";
  const showParentLinking = roleKey === "PARENT";

  const mappingHelp = useMemo(() => {
    if (!showTeacherMapping) return null;
    if (classes.length === 0) return "No classes exist yet. Create a class by adding a student with a class/section first.";
    return isClassTeacher
      ? "Pick exactly one class for this Class Teacher."
      : "Pick one or more classes (multi-select) for this Teacher.";
  }, [classes.length, isClassTeacher, showTeacherMapping]);

  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
      <div>
        <Label>Name</Label>
        <Input name="name" required />
      </div>
      <div>
        <Label>Email</Label>
        <Input name="email" type="email" required />
      </div>
      <div>
        <Label>Role</Label>
        <Select
          name="schoolRoleId"
          value={schoolRoleId}
          onChange={(e) => setSchoolRoleId(e.target.value)}
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Temporary password</Label>
        <Input name="password" type="password" minLength={8} required />
      </div>

      <div className="md:col-span-2 rounded-xl bg-black/20 border border-white/10 p-4">
        <div className="text-sm font-semibold">Class Assignment</div>
        <div className="mt-3">
          <Label>Assigned class(es)</Label>
          {showTeacherMapping ? (
            <select
              name="classIds"
              multiple={!isClassTeacher}
              className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:border-indigo-400"
              size={Math.min(6, Math.max(3, classes.length || 3))}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          ) : (
            <Select name="classIds" defaultValue="">
              <option value="">NA</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          )}
          <div className="mt-2 text-xs text-white/60">
            {showTeacherMapping
              ? mappingHelp
              : "Optional: class assignment is used for Teacher/Class Teacher only. Leave as NA for others."}
          </div>
        </div>
      </div>

      <div className="md:col-span-2 rounded-xl bg-black/20 border border-white/10 p-4">
        <div className="text-sm font-semibold">Module Access (User overrides)</div>
        <div className="mt-1 text-xs text-white/60">
          Set per-module access for this user. Leave as <code>Inherit</code> to use role defaults.
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {modules.map((m) => (
            <div key={m.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="text-sm font-semibold">{m.name}</div>
              <div className="mt-2">
                <Label>Permission</Label>
                <Select name={`perm_${m.id}`} defaultValue="">
                  <option value="">Inherit</option>
                  <option value="VIEW">View</option>
                  <option value="EDIT">Read + Write</option>
                  <option value="APPROVE">Approve</option>
                  <option value="ADMIN">Full Admin</option>
                </Select>
              </div>
            </div>
          ))}
          {modules.length === 0 ? (
            <div className="text-sm text-white/60">No modules enabled for this school.</div>
          ) : null}
        </div>
      </div>

      {showTeacherMapping ? (
        <div className="md:col-span-2 rounded-xl bg-black/20 border border-white/10 p-4">
          <div className="text-sm font-semibold">Notes</div>
          <div className="mt-2 text-xs text-white/60">
            Teachers will only see the classes/modules you allow via Role defaults + User overrides.
          </div>
        </div>
      ) : null}

      {showParentLinking ? (
        <div className="md:col-span-2 rounded-xl bg-black/20 border border-white/10 p-4">
          <div className="text-sm font-semibold">Parent linking (optional)</div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Link to student</Label>
              <select
                name="linkStudentId"
                className="mt-1 w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 outline-none focus:border-indigo-400"
                defaultValue=""
              >
                <option value="">(none)</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Relation</Label>
              <Input name="parentRelation" placeholder="Father / Mother / Guardian" />
            </div>
          </div>
        </div>
      ) : null}

      {!state.ok && state.message ? (
        <div className="md:col-span-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {state.message}
        </div>
      ) : null}

      <div className="md:col-span-2 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create user"}
        </Button>
      </div>
    </form>
  );
}
