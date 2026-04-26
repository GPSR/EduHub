"use client";

import { useMemo, useState } from "react";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";

type LeaveRequestType = "STUDENT" | "STAFF";

type LeaveRequestCreateCardProps = {
  canStudent: boolean;
  canStaff: boolean;
  classOptions: Array<{ id: string; label: string }>;
  students: Array<{ id: string; fullName: string; classId: string; classLabel: string }>;
  staffOptions: Array<{ id: string; name: string; roleLabel: string }>;
  createStudentAction: (formData: FormData) => Promise<void>;
  createStaffAction: (formData: FormData) => Promise<void>;
};

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return Date.UTC(year, month - 1, day);
}

function inclusiveDays(fromDate: string, toDate: string) {
  const from = parseIsoDate(fromDate);
  const to = parseIsoDate(toDate);
  if (from === null || to === null) return null;
  if (to < from) return null;
  return Math.floor((to - from) / 86_400_000) + 1;
}

function ModeChoice({
  id,
  label,
  checked,
  onChange
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
        checked
          ? "border-blue-300/45 bg-blue-500/20 text-white"
          : "border-white/[0.12] bg-white/[0.03] text-white/70 hover:bg-white/[0.08]"
      ].join(" ")}
    >
      <input id={id} type="radio" name="leaveRequestType" checked={checked} onChange={onChange} className="h-3.5 w-3.5" />
      {label}
    </label>
  );
}

export function LeaveRequestCreateCard({
  canStudent,
  canStaff,
  classOptions,
  students,
  staffOptions,
  createStudentAction,
  createStaffAction
}: LeaveRequestCreateCardProps) {
  const [requestType, setRequestType] = useState<LeaveRequestType | "">("");

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentFromDate, setStudentFromDate] = useState("");
  const [studentToDate, setStudentToDate] = useState("");

  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [staffFromDate, setStaffFromDate] = useState("");
  const [staffToDate, setStaffToDate] = useState("");

  const studentsForClass = useMemo(
    () => students.filter((student) => student.classId === selectedClassId),
    [selectedClassId, students]
  );

  const studentDayCount = inclusiveDays(studentFromDate, studentToDate);
  const staffDayCount = inclusiveDays(staffFromDate, staffToDate);

  const resetSelections = () => {
    setSelectedClassId("");
    setSelectedStudentId("");
    setStudentFromDate("");
    setStudentToDate("");
    setSelectedStaffId("");
    setStaffFromDate("");
    setStaffToDate("");
  };

  return (
    <Card
      title="Leave Requests"
      description="Create student or staff leave requests with dependent dropdowns"
      accent="indigo"
    >
      <details className="group rounded-[12px] border border-white/[0.10] bg-white/[0.02] px-3 py-2.5" open={false}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-white/88">New Leave Request</p>
            <p className="text-[11px] text-white/50">Collapsed by default. Expand when you need to submit.</p>
          </div>
          <span className="text-[11px] text-white/55 group-open:hidden">Open</span>
          <span className="hidden text-[11px] text-white/55 group-open:inline">Close</span>
        </summary>

        <div className="mt-4 space-y-4 border-t border-white/[0.08] pt-4">
          <div>
            <Label required>Request Type</Label>
            <div className="flex flex-wrap gap-2">
              {canStudent ? (
                <ModeChoice
                  id="leave-type-student"
                  label="Student"
                  checked={requestType === "STUDENT"}
                  onChange={() => {
                    setRequestType("STUDENT");
                    resetSelections();
                  }}
                />
              ) : null}
              {canStaff ? (
                <ModeChoice
                  id="leave-type-staff"
                  label="Staff"
                  checked={requestType === "STAFF"}
                  onChange={() => {
                    setRequestType("STAFF");
                    resetSelections();
                  }}
                />
              ) : null}
            </div>
          </div>

          {requestType === "" ? (
            <p className="rounded-[12px] border border-white/[0.10] bg-black/20 px-3 py-2 text-[12px] text-white/60">
              Select Student or Staff to continue.
            </p>
          ) : null}

          {requestType === "STUDENT" ? (
            <form action={createStudentAction} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label required>Select Class</Label>
                  <Select
                    value={selectedClassId}
                    onChange={(event) => {
                      setSelectedClassId(event.target.value);
                      setSelectedStudentId("");
                    }}
                    required
                  >
                    <option value="">Select class</option>
                    {classOptions.map((classOption) => (
                      <option key={classOption.id} value={classOption.id}>
                        {classOption.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label required>Select Student</Label>
                  <Select
                    name="studentId"
                    value={selectedStudentId}
                    onChange={(event) => setSelectedStudentId(event.target.value)}
                    required
                    disabled={!selectedClassId}
                  >
                    <option value="">Select student</option>
                    {studentsForClass.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.fullName} ({student.classLabel})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label required>From</Label>
                  <Input
                    name="fromDate"
                    type="date"
                    value={studentFromDate}
                    onChange={(event) => setStudentFromDate(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label required>To</Label>
                  <Input
                    name="toDate"
                    type="date"
                    value={studentToDate}
                    onChange={(event) => setStudentToDate(event.target.value)}
                    required
                  />
                </div>
              </div>

              {studentFromDate && studentToDate ? (
                <p className={`text-[12px] ${studentDayCount ? "text-emerald-200" : "text-rose-200"}`}>
                  {studentDayCount
                    ? `Selected date range: ${studentDayCount} day(s)`
                    : "Invalid date range. To date should be same as or after from date."}
                </p>
              ) : null}

              <div>
                <Label required>Reason</Label>
                <Textarea name="reason" rows={3} placeholder="Reason for student leave request" required />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={!selectedClassId || !selectedStudentId}>
                  Submit Leave Request
                </Button>
              </div>
            </form>
          ) : null}

          {requestType === "STAFF" ? (
            <form action={createStaffAction} className="space-y-3">
              <div>
                <Label required>Select Staff</Label>
                <Select
                  name="teacherUserId"
                  value={selectedStaffId}
                  onChange={(event) => setSelectedStaffId(event.target.value)}
                  required
                >
                  <option value="">Select staff</option>
                  {staffOptions.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} ({staff.roleLabel})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label required>From</Label>
                  <Input
                    name="fromDate"
                    type="date"
                    value={staffFromDate}
                    onChange={(event) => setStaffFromDate(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label required>To</Label>
                  <Input
                    name="toDate"
                    type="date"
                    value={staffToDate}
                    onChange={(event) => setStaffToDate(event.target.value)}
                    required
                  />
                </div>
              </div>

              {staffFromDate && staffToDate ? (
                <p className={`text-[12px] ${staffDayCount ? "text-emerald-200" : "text-rose-200"}`}>
                  {staffDayCount
                    ? `Selected date range: ${staffDayCount} day(s)`
                    : "Invalid date range. To date should be same as or after from date."}
                </p>
              ) : null}

              <div>
                <Label required>Reason</Label>
                <Textarea name="reason" rows={3} placeholder="Reason for staff leave request" required />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={!selectedStaffId}>
                  Submit Leave Request
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </details>
    </Card>
  );
}
