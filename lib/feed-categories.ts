export const FEED_CATEGORIES = [
  { value: "ANNOUNCEMENT", label: "Announcement" },
  { value: "HOLIDAY", label: "Holiday" },
  { value: "SCHOOL_OPEN", label: "School Open" },
  { value: "GRADUATION", label: "Graduation" },
  { value: "AWARD", label: "Awards" },
  { value: "FEES_REMINDER", label: "Fees Reminder" },
  { value: "EXAM_UPDATE", label: "Exam Update" },
  { value: "EVENT", label: "Event" },
  { value: "SPORTS", label: "Sports" },
  { value: "EMERGENCY", label: "Emergency" }
] as const;

export const DEFAULT_FEED_CATEGORY = "ANNOUNCEMENT";

export type FeedCategoryValue = (typeof FEED_CATEGORIES)[number]["value"];

export function getFeedCategoryLabel(value: string | null | undefined): string {
  const match = FEED_CATEGORIES.find((category) => category.value === value);
  return match?.label ?? "Announcement";
}
