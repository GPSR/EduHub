export default function LoadingPlatform() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-6">
        <div className="h-7 w-56 rounded-full bg-white/[0.08] animate-pulse mb-2" />
        <div className="h-4 w-80 rounded-full bg-white/[0.05] animate-pulse" />
      </div>
      {/* Stat grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-[22px] border border-white/[0.06] bg-white/[0.03] p-5"
               style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-8 w-8 rounded-[9px] bg-white/[0.07] animate-pulse mb-3" />
            <div className="h-7 w-16 rounded-full bg-white/[0.08] animate-pulse" />
            <div className="h-3 w-24 rounded-full bg-white/[0.04] animate-pulse mt-2" />
          </div>
        ))}
      </div>
      {/* Table skeleton */}
      <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.03] p-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-[12px] bg-white/[0.04] animate-pulse"
               style={{ animationDelay: `${i * 40}ms` }} />
        ))}
      </div>
    </div>
  );
}
