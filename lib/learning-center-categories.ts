export const LEARNING_CENTER_CATEGORIES = [
  { value: "GENERAL_KNOWLEDGE", label: "General Knowledge" },
  { value: "YOUTUBE_LEARNING", label: "YouTube Learning" },
  { value: "BRAIN_LEARNING", label: "Brain Learning" },
  { value: "EXAM_PREPARATION", label: "Exam Preparation" },
  { value: "STEM_ACTIVITY", label: "STEM Activity" },
  { value: "LANGUAGE_LAB", label: "Language Lab" },
  { value: "LIFE_SKILLS", label: "Life Skills" },
  { value: "CAREER_GUIDANCE", label: "Career Guidance" },
  { value: "ARTS_CREATIVITY", label: "Arts & Creativity" },
  { value: "HOLIDAY_LEARNING", label: "Holiday Learning" }
] as const;

export const DEFAULT_LEARNING_CENTER_CATEGORY = "GENERAL_KNOWLEDGE";

export type LearningCenterCategoryValue = (typeof LEARNING_CENTER_CATEGORIES)[number]["value"];

export function getLearningCenterCategoryLabel(value: string | null | undefined): string {
  const match = LEARNING_CENTER_CATEGORIES.find((category) => category.value === value);
  return match?.label ?? "General Knowledge";
}
