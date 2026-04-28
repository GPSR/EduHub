import { Card, SectionHeader } from "@/components/ui";

export default function CalendarLoading() {
  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader
        title="School Calendar"
        subtitle="School-level holidays, functions, exams, and important events"
      />

      <Card accent="indigo">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="h-4 w-40 rounded bg-white/[0.10]" />
            <div className="h-3 w-28 rounded bg-white/[0.08]" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-16 rounded-[10px] bg-white/[0.08]" />
            <div className="h-8 w-16 rounded-[10px] bg-white/[0.08]" />
            <div className="h-8 w-16 rounded-[10px] bg-white/[0.08]" />
          </div>
        </div>
      </Card>

      <Card title="Monthly Calendar" description="Loading month data..." accent="teal">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, index) => (
            <div key={index} className="aspect-square rounded-[12px] border border-white/[0.08] bg-white/[0.03]" />
          ))}
        </div>
      </Card>
    </div>
  );
}

