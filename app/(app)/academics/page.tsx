import Link from "next/link";
import { Card } from "@/components/ui";

export default function AcademicsHomePage() {
  return (
    <Card title="Academics">
      <div className="text-sm text-white/60">Homework and exam results (MVP).</div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/academics/homework" className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">
          Homework
        </Link>
        <Link href="/academics/exams" className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">
          Exam results
        </Link>
      </div>
    </Card>
  );
}

