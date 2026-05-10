"use client";

import { useActionState, useMemo, useState } from "react";
import { Button, Input, Label, Select, Badge } from "@/components/ui";
import { createUserAction, type CreateUserState } from "@/app/(app)/admin/users/actions";

const initialState: CreateUserState = { ok: true };

type ClassOption   = { id: string; label: string };
type StudentOption = { id: string; fullName: string; classId: string | null };
type RoleOption    = { id: string; key: string; name: string };
type ModuleOption  = { id: string; key: string; name: string };
type TeacherScheduleDraft = {
  id: string;
  classId: string;
  subjectName: string;
  weekday: string;
  startTime: string;
  endTime: string;
  room: string;
};

const MODULE_ICONS: Record<string, string> = {
  STUDENTS: "👥", FEES: "💳", ATTENDANCE: "✅", TIMETABLE: "🗓️", COMMUNICATION: "📢",
  EXAMS: "🧪", TEACHERS: "👩‍🏫",
  ACADEMICS: "📚", LEARNING_CENTER: "🧠", REPORTS: "📊", NOTIFICATIONS: "🔔",
  GALLERY: "🖼️", SCHOOL_CALENDAR: "🗓️", LEAVE_REQUESTS: "📝",
  TEACHER_SALARY: "💼", SETTINGS: "⚙️", DASHBOARD: "◈", USERS: "🛡",
};

const PERM_LEVELS = [
  { value: "NOT_REQUIRED", label: "Not required" },
  { value: "",        label: "Inherit from role" },
  { value: "VIEW",    label: "View only" },
  { value: "EDIT",    label: "Read + Write" },
  { value: "APPROVE", label: "Approve" },
  { value: "ADMIN",   label: "Full Admin" },
];

const WEEKDAY_OPTIONS = [
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
  { value: "7", label: "Sun" }
];

function createTeacherScheduleDraft(defaultClassId = ""): TeacherScheduleDraft {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    classId: defaultClassId,
    subjectName: "",
    weekday: "",
    startTime: "",
    endTime: "",
    room: ""
  };
}

export function AdminCreateUserForm({ roles, modules, classes, students }: {
  roles: RoleOption[]; modules: ModuleOption[];
  classes: ClassOption[]; students: StudentOption[];
}) {
  const [state, action, pending] = useActionState(createUserAction, initialState);
  const defaultRoleId = roles.find(r => r.key === "TEACHER")?.id ?? roles[0]?.id ?? "";
  const [schoolRoleId, setSchoolRoleId] = useState<string>(defaultRoleId);
  const [parentClassId, setParentClassId] = useState<string>("");
  const [teacherSchedules, setTeacherSchedules] = useState<TeacherScheduleDraft[]>([
    createTeacherScheduleDraft()
  ]);
  const roleKey = useMemo(() => roles.find(r => r.id === schoolRoleId)?.key ?? "", [roles, schoolRoleId]);
  const visibleModules = useMemo(() => modules.filter((module) => module.key !== "YOUTUBE_LEARNING"), [modules]);
  const parentStudents = useMemo(
    () => (parentClassId ? students.filter((s) => s.classId === parentClassId) : students),
    [students, parentClassId]
  );

  const isTeacher      = roleKey === "TEACHER" || roleKey === "CLASS_TEACHER";
  const isClassTeacher = roleKey === "CLASS_TEACHER";
  const isParent       = roleKey === "PARENT";

  const updateTeacherSchedule = (rowId: string, patch: Partial<TeacherScheduleDraft>) => {
    setTeacherSchedules((current) => current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  };

  const addTeacherScheduleRow = () => {
    setTeacherSchedules((current) => [...current, createTeacherScheduleDraft()]);
  };

  const removeTeacherScheduleRow = (rowId: string) => {
    setTeacherSchedules((current) => {
      if (current.length <= 1) {
        return [createTeacherScheduleDraft()];
      }
      return current.filter((row) => row.id !== rowId);
    });
  };

  return (
    <form action={action} className="space-y-6">

      {/* ── Basic info ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <Label required>Full name</Label>
          <Input name="name" placeholder="Jane Smith" required />
        </div>
        <div>
          <Label required>Email address</Label>
          <Input name="email" type="email" placeholder="jane@school.edu" required />
        </div>
        <div>
          <Label required>Role</Label>
          <Select name="schoolRoleId" value={schoolRoleId} onChange={e => setSchoolRoleId(e.target.value)}>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </div>
        <div>
          <Label required>Temporary password</Label>
          <Input name="password" type="password" minLength={8} placeholder="Min. 8 characters" required />
          <p className="mt-1 text-[11px] text-white/35">User should change this after first login.</p>
        </div>
      </div>

      {/* ── Class assignment (teachers only) ── */}
      {isTeacher && (
        <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🏫</span>
            <p className="text-[13px] font-semibold text-white/85">Class Assignment</p>
            {isClassTeacher
              ? <Badge tone="info">Pick one class</Badge>
              : <Badge tone="neutral">Multi-select</Badge>}
          </div>
          {classes.length === 0 ? (
            <p className="text-sm text-white/50">No classes yet — add a student with a class first.</p>
          ) : (
            <>
              <select
                name="classIds"
                multiple={!isClassTeacher}
                className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-400/50 transition-all"
                size={Math.min(6, Math.max(3, classes.length))}
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <p className="mt-2 text-[11px] text-white/35">
                {isClassTeacher ? "Select exactly one class." : "Hold Ctrl/Cmd to select multiple."}
              </p>
            </>
          )}
        </div>
      )}

      {isTeacher && (
        <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">📘</span>
              <p className="text-[13px] font-semibold text-white/85">Teacher Subject + Grade + Timing</p>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={addTeacherScheduleRow}>
              + Add slot
            </Button>
          </div>
          <p className="mb-3 text-[11px] text-white/40">
            Optional during user creation. Add subject schedule now so admin can see complete teacher load.
          </p>

          {teacherSchedules.map((row, index) => (
            <div key={row.id} className="mb-3 rounded-[12px] border border-white/[0.07] bg-black/20 p-3 last:mb-0">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Slot {index + 1}</p>
                <Button type="button" size="sm" variant="ghost" onClick={() => removeTeacherScheduleRow(row.id)}>
                  Remove
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label>Grade / Class</Label>
                  <select
                    name="teacherScheduleClassId"
                    value={row.classId}
                    onChange={(event) => updateTeacherSchedule(row.id, { classId: event.target.value })}
                    className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-400/50 transition-all"
                  >
                    <option value="">Select class</option>
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>{classItem.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Input
                    name="teacherScheduleSubject"
                    value={row.subjectName}
                    onChange={(event) => updateTeacherSchedule(row.id, { subjectName: event.target.value })}
                    placeholder="Mathematics"
                  />
                </div>
                <div>
                  <Label>Day</Label>
                  <select
                    name="teacherScheduleWeekday"
                    value={row.weekday}
                    onChange={(event) => updateTeacherSchedule(row.id, { weekday: event.target.value })}
                    className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-400/50 transition-all"
                  >
                    <option value="">Select day</option>
                    {WEEKDAY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Start time</Label>
                  <Input
                    name="teacherScheduleStartTime"
                    type="time"
                    value={row.startTime}
                    onChange={(event) => updateTeacherSchedule(row.id, { startTime: event.target.value })}
                  />
                </div>
                <div>
                  <Label>End time</Label>
                  <Input
                    name="teacherScheduleEndTime"
                    type="time"
                    value={row.endTime}
                    onChange={(event) => updateTeacherSchedule(row.id, { endTime: event.target.value })}
                  />
                </div>
                <div>
                  <Label>Room (optional)</Label>
                  <Input
                    name="teacherScheduleRoom"
                    value={row.room}
                    onChange={(event) => updateTeacherSchedule(row.id, { room: event.target.value })}
                    placeholder="Room 203"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Parent linking (parents only) ── */}
      {isParent && (
        <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">👨‍👩‍👧</span>
            <p className="text-[13px] font-semibold text-white/85">Parent Linking</p>
            <Badge tone="neutral">Optional</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label>Class</Label>
              <select
                name="parentClassId"
                value={parentClassId}
                onChange={(e) => setParentClassId(e.target.value)}
                className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-400/50 transition-all"
              >
                <option value="">All classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Link to student</Label>
              <select
                name="linkStudentId"
                defaultValue=""
                className="w-full rounded-[13px] bg-black/25 border border-white/[0.09] px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-400/50 transition-all"
              >
                <option value="">(none)</option>
                {parentStudents.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-white/35">
                Choose class first to narrow student list.
              </p>
            </div>
            <div>
              <Label>Relation</Label>
              <Input name="parentRelation" placeholder="Father / Mother / Guardian" />
            </div>
          </div>
        </div>
      )}

      {/* ── Module overrides ── */}
      {visibleModules.length > 0 && (
        <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">🔐</span>
            <p className="text-[13px] font-semibold text-white/85">Module Access Overrides</p>
          </div>
          <p className="text-[11px] text-white/35 mb-4">
            Leave as "Inherit" to use role defaults. Only change when this user needs different access.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleModules.map(m => (
              <div key={m.id} className="rounded-[13px] border border-white/[0.07] bg-white/[0.025] px-3.5 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{MODULE_ICONS[m.key] ?? "•"}</span>
                  <span className="text-[13px] font-semibold text-white/80">{m.name}</span>
                </div>
                <Select name={`perm_${m.id}`} defaultValue="" className="!mt-0 text-xs">
                  {PERM_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── State message ── */}
      {!state.ok && state.message && (
        <div className="flex items-start gap-2.5 rounded-[12px] border border-rose-500/25 bg-rose-500/10 p-3.5 text-sm text-rose-200">
          <span className="shrink-0 mt-0.5">⚠</span>
          {state.message}
        </div>
      )}
      {state.ok && state.message && (
        <div className="flex items-start gap-2.5 rounded-[12px] border border-emerald-500/25 bg-emerald-500/10 p-3.5 text-sm text-emerald-200">
          <span className="shrink-0 mt-0.5">✓</span>
          {state.message}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Creating…
            </span>
          ) : "Create user →"}
        </Button>
      </div>
    </form>
  );
}
