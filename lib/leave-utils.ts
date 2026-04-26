export function startOfDay(date: Date) {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function endOfDay(date: Date) {
  const out = new Date(date);
  out.setHours(23, 59, 59, 999);
  return out;
}

export function parseDateOnlyInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfDay(parsed);
}

export function eachDayInclusive(fromDate: Date, toDate: Date) {
  const from = startOfDay(fromDate);
  const to = startOfDay(toDate);
  const days: Date[] = [];
  for (const cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
    days.push(new Date(cursor));
  }
  return days;
}

export function inclusiveDayCount(fromDate: Date, toDate: Date) {
  const from = startOfDay(fromDate).getTime();
  const to = startOfDay(toDate).getTime();
  if (to < from) return 0;
  return Math.floor((to - from) / 86_400_000) + 1;
}

export function overlapDayCount(rangeStart: Date, rangeEnd: Date, windowStart: Date, windowEnd: Date) {
  const start = Math.max(startOfDay(rangeStart).getTime(), startOfDay(windowStart).getTime());
  const end = Math.min(startOfDay(rangeEnd).getTime(), startOfDay(windowEnd).getTime());
  if (end < start) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function parseMonthKey(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [yearRaw, monthRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const parsed = new Date(year, month - 1, 1);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfDay(parsed);
}

export function formatMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function monthWindow(monthStart: Date) {
  const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const end = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function yearWindow(year: number) {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { start, end };
}
