"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { CalendarAudiencePicker } from "./calendar-audience-picker";
import {
  createSchoolCalendarEventAction,
  deleteSchoolCalendarEventAction,
  updateSchoolCalendarEventAction
} from "./actions";

type GridDay = {
  key: string;
  dayNumber: number;
  inMonth: boolean;
  events: Array<{
    id: string;
    title: string;
    description?: string;
    eventType: string;
    audienceScope?: "SCHOOL_WIDE" | "CLASS_WISE";
    startsOn?: string;
    endsOn?: string;
    classIds?: string[];
  }>;
};

type ClassOption = {
  id: string;
  name: string;
  section: string;
};

const CALENDAR_WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

function eventTypeIcon(eventType: string) {
  if (eventType === "HOLIDAY") return "🌴";
  if (eventType === "FUNCTION") return "🎉";
  if (eventType === "EXAM") return "📝";
  return "📌";
}

function eventTypeLabel(eventType: string) {
  if (eventType === "HOLIDAY") return "Holiday";
  if (eventType === "FUNCTION") return "Function";
  if (eventType === "EXAM") return "Exam";
  return "Other";
}

function humanDate(dateKey: string) {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return parsed.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function dateKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function eventTypeDotClass(eventType: string) {
  if (eventType === "HOLIDAY") return "bg-emerald-300";
  if (eventType === "FUNCTION") return "bg-violet-300";
  if (eventType === "EXAM") return "bg-amber-300";
  return "bg-cyan-300";
}

export function CalendarMonthGrid({
  canManage,
  canAdminManage,
  activeMonthKey,
  monthLabel,
  initialAddDate,
  days,
  classes
}: {
  canManage: boolean;
  canAdminManage: boolean;
  activeMonthKey: string;
  monthLabel: string;
  initialAddDate?: string;
  days: GridDay[];
  classes: ClassOption[];
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [selectedViewDay, setSelectedViewDay] = useState<GridDay | null>(null);
  const [editingEvent, setEditingEvent] = useState<(GridDay["events"][number] & { dayKey: string }) | null>(null);
  const [mounted, setMounted] = useState(false);
  const anyModalOpen = !!selectedViewDay || !!editingEvent || (canManage && openAddModal);

  useEffect(() => {
    if (canManage && initialAddDate) {
      setSelectedDate(initialAddDate);
      setOpenAddModal(true);
    }
  }, [canManage, initialAddDate]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!anyModalOpen) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [anyModalOpen]);

  const todayKey = useMemo(() => dateKeyFromDate(new Date()), []);
  const modalDate = useMemo(() => {
    if (selectedDate) return selectedDate;
    return todayKey;
  }, [selectedDate, todayKey]);

  const openForDay = (dayKey: string) => {
    if (!canManage) return;
    setSelectedDate(dayKey);
    setOpenAddModal(true);
  };

  const openViewForDay = (day: GridDay) => {
    setSelectedViewDay(day);
  };

  const openEditForEvent = (event: GridDay["events"][number], dayKey: string) => {
    if (!canAdminManage) return;
    setSelectedViewDay(null);
    setEditingEvent({ ...event, dayKey });
  };

  return (
    <>
      <Card
        title="Monthly Calendar"
        description="Full month details with daily events. Use + on any day to add a new event."
        accent="teal"
      >
        <div className="grid grid-cols-7 gap-1">
          {CALENDAR_WEEK_DAYS.map((day) => (
            <div
              key={day}
              className="rounded-[8px] border border-white/[0.08] bg-white/[0.03] px-1 py-1 text-center text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.08em] text-white/62"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1 sm:hidden">
          {days.map((day) => {
            const isToday = day.key === todayKey;
            const visibleDots = day.events.slice(0, 3);
            return (
              <article
                key={day.key}
                onClick={() => openViewForDay(day)}
                className={`relative flex aspect-square cursor-pointer flex-col overflow-hidden rounded-[12px] border p-1.5 ${
                  day.inMonth
                    ? "border-white/[0.11] bg-white/[0.035]"
                    : "border-white/[0.06] bg-white/[0.015] opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none ${
                      isToday
                        ? "bg-gradient-to-b from-[#67b4ff] to-[#4f8dfd] text-white shadow-[0_8px_16px_-10px_rgba(79,141,253,0.95)]"
                        : day.inMonth
                          ? "text-white/90"
                          : "text-white/55"
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  {canManage && day.inMonth ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openForDay(day.key);
                      }}
                      className="sm-btn inline-flex h-4 w-4 min-h-0 items-center justify-center rounded-full border border-blue-300/45 bg-blue-500/20 text-[10px] font-bold leading-none text-blue-100 transition hover:bg-blue-500/30"
                      aria-label={`Add event on ${day.key}`}
                    >
                      +
                    </button>
                  ) : null}
                </div>

                <div className="mt-auto">
                  {visibleDots.length > 0 ? (
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        {visibleDots.map((event, index) => (
                          <span
                            key={`${event.id}-${day.key}-dot-${index}`}
                            className={`h-1.5 w-1.5 rounded-full ${eventTypeDotClass(event.eventType)}`}
                          />
                        ))}
                        {day.events.length > 3 ? (
                          <span className="text-[8px] font-semibold text-white/58">+{day.events.length - 3}</span>
                        ) : null}
                      </div>
                      <span className="inline-flex min-w-4 items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.05] px-1 text-[8px] font-semibold text-white/72">
                        {day.events.length}
                      </span>
                    </div>
                  ) : (
                    <div className="h-[10px]" />
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-2 hidden grid-cols-7 gap-1 sm:grid">
          {days.map((day) => (
            <article
              key={day.key}
              onClick={() => openViewForDay(day)}
              className={`min-h-[78px] sm:min-h-[130px] rounded-[10px] sm:rounded-[12px] border p-1 sm:p-2 ${
                day.inMonth
                  ? "border-white/[0.10] bg-white/[0.03]"
                  : "border-white/[0.06] bg-white/[0.015] opacity-65"
              } cursor-pointer`}
            >
              <div className="flex items-center justify-between gap-1">
                <p className={`text-[10px] sm:text-[11px] font-semibold ${day.inMonth ? "text-white/88" : "text-white/52"}`}>
                  {day.dayNumber}
                </p>
                {canManage ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openForDay(day.key);
                    }}
                    className="sm-btn inline-flex h-4 w-4 min-h-0 sm:h-5 sm:w-5 items-center justify-center rounded-full border border-blue-300/40 bg-blue-500/15 text-[10px] sm:text-[12px] font-bold leading-none text-blue-100/90 transition hover:bg-blue-500/25"
                    aria-label={`Add event on ${day.key}`}
                  >
                    +
                  </button>
                ) : null}
              </div>

              <div className="mt-1 sm:hidden">
                {day.events.length > 0 ? (
                  <div className="flex items-center gap-1 text-[9px] text-white/72">
                    <span>{day.events[0] ? eventTypeIcon(day.events[0].eventType) : "•"}</span>
                    <span>{day.events.length}</span>
                  </div>
                ) : (
                  <span className="text-[9px] text-white/35">-</span>
                )}
              </div>

              <div className="mt-1.5 space-y-1 hidden sm:block">
                {day.events.slice(0, 3).map((event) => {
                  return (
                    <div
                      key={`${event.id}-${day.key}`}
                      className="rounded-[8px] border border-white/[0.10] bg-white/[0.04] px-1.5 py-1"
                      title={event.title}
                      >
                        <p className="truncate text-[10px] font-medium text-white/88">
                        <span className="mr-1">{eventTypeIcon(event.eventType)}</span>
                        {event.title}
                      </p>
                    </div>
                  );
                })}
                {day.events.length > 3 ? (
                  <p className="px-1 text-[10px] text-white/55">+{day.events.length - 3} more</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </Card>

      {mounted && selectedViewDay ? createPortal(
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center overflow-hidden bg-[#020814]/94 p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-day-events-title"
          onClick={() => setSelectedViewDay(null)}
        >
          <div
            className="relative isolate w-full max-w-[560px] max-h-[min(76dvh,620px)] overflow-hidden rounded-[16px] border border-white/[0.14] bg-[#0b1324] shadow-[0_36px_90px_-30px_rgba(0,0,0,0.95)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-full flex-col">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.10] bg-[#0b1324] px-4 py-3">
                <div>
                  <p id="calendar-day-events-title" className="text-[14px] font-semibold text-white/92">Events</p>
                  <p className="text-[11px] text-white/55">{humanDate(selectedViewDay.key)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedViewDay(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.14] bg-[#101b30] text-white/80 transition hover:bg-white/[0.08]"
                  aria-label="Close events popup"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 p-4 sm:p-5">
                {selectedViewDay.events.length > 0 ? (
                  selectedViewDay.events.map((event) => (
                    <article
                      key={event.id}
                      className="rounded-[12px] border border-white/[0.10] bg-white/[0.04] px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-2">
                          <span className="text-[15px] leading-none">{eventTypeIcon(event.eventType)}</span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-white/90 break-words">{event.title}</p>
                            <p className="mt-0.5 text-[11px] text-white/55">{eventTypeLabel(event.eventType)}</p>
                          </div>
                        </div>
                        {canAdminManage ? (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="px-2.5"
                              onClick={() => openEditForEvent(event, selectedViewDay.key)}
                            >
                              Edit
                            </Button>
                            <form action={deleteSchoolCalendarEventAction}>
                              <input type="hidden" name="eventId" value={event.id} />
                              <input type="hidden" name="monthKey" value={activeMonthKey} />
                              <Button type="submit" size="sm" variant="danger" className="px-2.5">Delete</Button>
                            </form>
                          </div>
                        ) : null}
                      </div>
                      {event.description ? (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-white/70 break-words">{event.description}</p>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-white/55">No events created for this day.</p>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {mounted && canManage && openAddModal ? createPortal(
        <div
          className="fixed inset-0 z-[510] flex items-end sm:items-center justify-center bg-[#020814]/96 p-0 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-add-event-title"
          onClick={() => setOpenAddModal(false)}
        >
          <div
            className="relative isolate w-full h-dvh sm:h-auto sm:max-h-[calc(100dvh-1rem)] sm:max-w-[680px] overflow-hidden rounded-none sm:rounded-[18px] border border-white/[0.14] bg-[#0b1324] shadow-[0_36px_90px_-30px_rgba(0,0,0,0.95)]"
            onClick={(event) => event.stopPropagation()}
          >
            <form
              key={modalDate}
              action={createSchoolCalendarEventAction}
              className="flex h-full flex-col"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.10] bg-[#0b1324] px-4 py-[max(0.75rem,env(safe-area-inset-top))] sm:py-3">
                <div>
                  <p id="calendar-add-event-title" className="text-[14px] font-semibold text-white/92">Add Calendar Event</p>
                  <p className="text-[11px] text-white/55">{monthLabel} · {modalDate}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenAddModal(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.14] bg-[#101b30] text-white/80 transition hover:bg-white/[0.08]"
                  aria-label="Close add event popup"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 p-4 sm:space-y-4 sm:p-5">
                <div>
                  <Label required>Title</Label>
                  <Input name="title" placeholder="Quarterly Exams" required className="bg-[#101b30]" />
                </div>

                <div>
                  <Label>Event type</Label>
                  <select
                    name="eventType"
                    defaultValue="HOLIDAY"
                    className="w-full rounded-[12px] border border-white/[0.12] bg-[#101b30] px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
                  >
                    <option value="HOLIDAY">Holiday</option>
                    <option value="FUNCTION">Function</option>
                    <option value="EXAM">Exam</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <CalendarAudiencePicker classes={classes} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label required>Start date</Label>
                    <Input name="startsOn" type="date" defaultValue={modalDate} required className="bg-[#101b30]" />
                  </div>
                  <div>
                    <Label>End date</Label>
                    <Input name="endsOn" type="date" defaultValue={modalDate} className="bg-[#101b30]" />
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    name="description"
                    rows={3}
                    placeholder="Additional event details for school community"
                    className="bg-[#101b30]"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-white/[0.10] bg-[#0b1324] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
                <Button type="button" variant="secondary" onClick={() => setOpenAddModal(false)}>Cancel</Button>
                <Button type="submit">Add event</Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      ) : null}

      {mounted && canAdminManage && editingEvent ? createPortal(
        <div
          className="fixed inset-0 z-[520] flex items-end sm:items-center justify-center bg-[#020814]/96 p-0 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-edit-event-title"
          onClick={() => setEditingEvent(null)}
        >
          <div
            className="relative isolate w-full h-dvh sm:h-auto sm:max-h-[calc(100dvh-1rem)] sm:max-w-[680px] overflow-hidden rounded-none sm:rounded-[18px] border border-white/[0.14] bg-[#0b1324] shadow-[0_36px_90px_-30px_rgba(0,0,0,0.95)]"
            onClick={(event) => event.stopPropagation()}
          >
            <form action={updateSchoolCalendarEventAction} className="flex h-full flex-col">
              <input type="hidden" name="eventId" value={editingEvent.id} />

              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.10] bg-[#0b1324] px-4 py-[max(0.75rem,env(safe-area-inset-top))] sm:py-3">
                <div>
                  <p id="calendar-edit-event-title" className="text-[14px] font-semibold text-white/92">Edit Calendar Event</p>
                  <p className="text-[11px] text-white/55">{monthLabel} · {editingEvent.startsOn ?? editingEvent.dayKey}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.14] bg-[#101b30] text-white/80 transition hover:bg-white/[0.08]"
                  aria-label="Close edit event popup"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 p-4 sm:space-y-4 sm:p-5">
                <div>
                  <Label required>Title</Label>
                  <Input name="title" defaultValue={editingEvent.title} required className="bg-[#101b30]" />
                </div>

                <div>
                  <Label>Event type</Label>
                  <select
                    name="eventType"
                    defaultValue={editingEvent.eventType}
                    className="w-full rounded-[12px] border border-white/[0.12] bg-[#101b30] px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
                  >
                    <option value="HOLIDAY">Holiday</option>
                    <option value="FUNCTION">Function</option>
                    <option value="EXAM">Exam</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <CalendarAudiencePicker
                  key={`edit-audience-${editingEvent.id}`}
                  classes={classes}
                  initialAudienceScope={editingEvent.audienceScope === "CLASS_WISE" ? "CLASS_WISE" : "SCHOOL_WIDE"}
                  initialClassIds={editingEvent.classIds ?? []}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label required>Start date</Label>
                    <Input
                      name="startsOn"
                      type="date"
                      defaultValue={editingEvent.startsOn ?? editingEvent.dayKey}
                      required
                      className="bg-[#101b30]"
                    />
                  </div>
                  <div>
                    <Label>End date</Label>
                    <Input
                      name="endsOn"
                      type="date"
                      defaultValue={editingEvent.endsOn ?? editingEvent.startsOn ?? editingEvent.dayKey}
                      className="bg-[#101b30]"
                    />
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    name="description"
                    rows={3}
                    defaultValue={editingEvent.description ?? ""}
                    className="bg-[#101b30]"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-white/[0.10] bg-[#0b1324] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
                <Button type="button" variant="secondary" onClick={() => setEditingEvent(null)}>Cancel</Button>
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
