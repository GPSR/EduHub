export default function LoadingDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-6 w-36 rounded-full bg-white/[0.07] animate-pulse" />
        <div className="h-4 w-56 rounded-full bg-white/[0.04] animate-pulse" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[18px] border border-white/[0.07] bg-white/[0.03] p-5"
               style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-10 w-10 rounded-[11px] bg-white/[0.06] animate-pulse mb-3" />
            <div className="h-7 w-16 rounded-full bg-white/[0.07] animate-pulse" />
            <div className="h-3 w-20 rounded-full bg-white/[0.04] animate-pulse mt-2" />
          </div>
        ))}
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-[22px] border border-white/[0.07] bg-white/[0.03] p-6">
            <div className="h-4 w-24 rounded-full bg-white/[0.07] animate-pulse mb-4" />
            <div className="space-y-3">
              <div className="h-4 w-full rounded-full bg-white/[0.05] animate-pulse" />
              <div className="h-4 w-3/4 rounded-full bg-white/[0.04] animate-pulse" />
              <div className="h-4 w-1/2 rounded-full bg-white/[0.03] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
