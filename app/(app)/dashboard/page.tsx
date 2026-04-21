import { Card, SectionHeader, Badge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require";

export default async function DashboardPage() {
  const session = await requireSession();
  const [students, teachers, pendingFees, posts, school] = await Promise.all([
    prisma.student.count({ where: { schoolId: session.schoolId } }),
    prisma.user.count({
      where: { schoolId: session.schoolId, schoolRole: { key: { in: ["TEACHER", "CLASS_TEACHER"] } } }
    }),
    prisma.feeInvoice.count({ where: { schoolId: session.schoolId, status: { not: "PAID" } } }),
    prisma.feedPost.count({ where: { schoolId: session.schoolId } }),
    prisma.school.findUnique({
      where: { id: session.schoolId },
      include: { subscription: true }
    })
  ]);

  const plan = school?.subscription?.plan ?? "TRIAL";
  const isActive = school?.isActive ?? false;

  return (
    <div className="space-y-6 animate-fade-up">
      <SectionHeader title="Dashboard" subtitle={`Welcome back — ${school?.name ?? "your school"}`} />

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="👥" label="Students" value={students}
          color="indigo" delay="stagger-1"
        />
        <StatCard
          icon="🏫" label="Teachers" value={teachers}
          color="teal" delay="stagger-2"
        />
        <StatCard
          icon="💳" label="Pending Fees" value={pendingFees}
          color={pendingFees > 0 ? "amber" : "emerald"} delay="stagger-3"
        />
        <StatCard
          icon="📢" label="Feed Posts" value={posts}
          color="violet" delay="stagger-4"
        />
      </div>

      {/* School info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="School" accent="indigo">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Name</p>
              <p className="text-[15px] font-semibold text-white/90">{school?.name ?? "—"}</p>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Plan</p>
                <Badge tone={plan === "TRIAL" ? "warning" : "success"}>{plan}</Badge>
              </div>
              <div>
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Status</p>
                <Badge tone={isActive ? "success" : "danger"} dot>
                  {isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Quick Access" accent="teal">
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/students",   icon: "👥", label: "Students"   },
              { href: "/fees",       icon: "💳", label: "Fees"       },
              { href: "/attendance", icon: "✅", label: "Attendance" },
              { href: "/feed",       icon: "📢", label: "Feed"       },
            ].map(item => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-[13px] border border-white/[0.07] bg-white/[0.03]
                           px-3.5 py-3 hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-150"
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-[13px] font-medium text-white/80">{item.label}</span>
              </a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, color, delay
}: {
  icon: string;
  label: string;
  value: number;
  color: "indigo" | "teal" | "amber" | "emerald" | "violet";
  delay: string;
}) {
  const colorMap = {
    indigo:  { bg: "bg-indigo-500/10",  text: "text-indigo-400",  border: "border-indigo-500/20" },
    teal:    { bg: "bg-teal-500/10",    text: "text-teal-400",    border: "border-teal-500/20"   },
    amber:   { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20"  },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20"},
    violet:  { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/20" },
  }[color];

  return (
    <div className={`animate-fade-up ${delay} rounded-[18px] border border-white/[0.08] bg-white/[0.04]
                     p-5 hover:bg-white/[0.06] transition-all duration-200
                     shadow-[0_1px_3px_rgba(0,0,0,0.4)]`}>
      <div className={`mb-3 inline-flex items-center justify-center w-10 h-10 rounded-[11px] ${colorMap.bg} ${colorMap.border} border`}>
        <span className="text-lg leading-none">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-white/95 tracking-tight">{value.toLocaleString()}</div>
      <div className="mt-1 text-[12px] font-medium text-white/45 uppercase tracking-wider">{label}</div>
    </div>
  );
}
