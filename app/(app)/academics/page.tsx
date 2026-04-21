import Link from "next/link";
import { SectionHeader } from "@/components/ui";

const SECTIONS = [
  {
    href: "/academics/homework",
    icon: "📝",
    title: "Homework",
    desc: "Track and post homework assignments per student or class.",
    color: "from-violet-500/20 to-indigo-500/10 border-violet-500/20",
    accent: "text-violet-300",
  },
  {
    href: "/academics/exams",
    icon: "📊",
    title: "Exam Results",
    desc: "Record and review exam scores across subjects.",
    color: "from-teal-500/20 to-emerald-500/10 border-teal-500/20",
    accent: "text-teal-300",
  },
];

export default function AcademicsHomePage() {
  return (
    <div className="space-y-5 animate-fade-up">
      <SectionHeader title="Academics" subtitle="Homework and exam management" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTIONS.map(s => (
          <Link
            key={s.href}
            href={s.href}
            className={`group relative rounded-[22px] border bg-gradient-to-br ${s.color}
                        p-6 hover:scale-[1.02] transition-all duration-200
                        shadow-[0_1px_3px_rgba(0,0,0,0.4)]`}
          >
            <div className="text-3xl mb-4">{s.icon}</div>
            <h2 className={`text-lg font-bold ${s.accent} mb-1`}>{s.title}</h2>
            <p className="text-sm text-white/55 leading-relaxed">{s.desc}</p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-white/40 group-hover:text-white/70 transition">
              Open {s.title}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="translate-x-0 group-hover:translate-x-1 transition-transform">
                <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
