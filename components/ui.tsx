import { clsx } from "clsx";

/* ─── Card ──────────────────────────────────────── */
export function Card({
  title, description, accent, children, className
}: {
  title?: string; description?: string;
  accent?: "indigo"|"emerald"|"amber"|"rose"|"teal"|"violet";
  children: React.ReactNode; className?: string;
}) {
  const accentBar: Record<string, string> = {
    indigo:  "before:bg-indigo-500",
    emerald: "before:bg-emerald-500",
    amber:   "before:bg-amber-500",
    rose:    "before:bg-rose-500",
    teal:    "before:bg-teal-500",
    violet:  "before:bg-violet-500",
  };
  return (
    <div className={clsx(
      "relative rounded-[18px] sm:rounded-[22px] border border-white/[0.08] bg-white/[0.04]",
      "backdrop-blur-sm p-4 sm:p-6 transition-all duration-200",
      "hover:border-white/[0.11]",
      "shadow-[0_1px_3px_rgba(0,0,0,0.4)]",
      accent && [
        "before:absolute before:left-0 before:top-5 before:bottom-5 sm:before:top-6 sm:before:bottom-6",
        "before:w-[3px] before:rounded-r-full before:opacity-80",
        accentBar[accent],
      ],
      className
    )}>
      {title && (
        <div className={clsx("mb-3 sm:mb-4", accent && "pl-1")}>
          <h2 className="text-[14px] sm:text-[15px] font-semibold tracking-[-0.01em] text-white/95">{title}</h2>
          {description && <p className="mt-0.5 text-xs sm:text-sm text-white/50 leading-relaxed">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── SectionHeader ─────────────────────────────── */
export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 sm:mb-5">
      <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-white/95">{title}</h1>
      {subtitle && <p className="mt-0.5 text-xs sm:text-sm text-white/50">{subtitle}</p>}
    </div>
  );
}

/* ─── Label ─────────────────────────────────────── */
export function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[13px] font-medium text-white/65 mb-1.5">
      {children}
      {required && <span className="ml-0.5 text-rose-400">*</span>}
    </label>
  );
}

/* ─── Input ─────────────────────────────────────── */
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} className={clsx(
      "w-full rounded-[13px] bg-black/25 border border-white/[0.09]",
      "px-3.5 py-3 sm:py-2.5",   // taller tap target on mobile
      "text-[16px] sm:text-sm text-white placeholder:text-white/30 outline-none",
      "transition-all duration-150",
      "hover:border-white/[0.15]",
      "focus:border-indigo-400/50 focus:bg-black/30 focus:ring-4 focus:ring-indigo-500/12",
      props.className
    )} />
  );
}

/* ─── Select ────────────────────────────────────── */
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={clsx(
      "w-full rounded-[13px] bg-black/25 border border-white/[0.09]",
      "px-3.5 py-3 sm:py-2.5",
      "text-[16px] sm:text-sm text-white outline-none appearance-none",
      "transition-all duration-150",
      "hover:border-white/[0.15]",
      "focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-500/12",
      props.className
    )} />
  );
}

/* ─── Textarea ──────────────────────────────────── */
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={clsx(
      "w-full rounded-[13px] bg-black/25 border border-white/[0.09]",
      "px-3.5 py-3 sm:py-2.5",
      "text-[16px] sm:text-sm text-white placeholder:text-white/30 outline-none resize-none",
      "transition-all duration-150",
      "hover:border-white/[0.15]",
      "focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-500/12",
      props.className
    )} />
  );
}

/* ─── Button ────────────────────────────────────── */
export function Button({
  variant = "primary", size = "md", ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary"|"secondary"|"danger"|"ghost";
  size?: "sm"|"md"|"lg";
}) {
  const sizeStyles = {
    sm: "px-3 py-2 text-[13px] rounded-[10px] min-h-[36px]",
    md: "px-4 py-2.5 sm:py-2 text-sm rounded-[13px] min-h-[42px] sm:min-h-[36px]",
    lg: "px-5 py-3 text-[15px] rounded-[14px] min-h-[48px] sm:min-h-[44px]",
  }[size];

  const variantStyles = {
    primary:   "bg-gradient-to-b from-indigo-400 to-indigo-600 text-white font-semibold shadow-[0_8px_20px_-8px_rgba(99,102,241,0.5)] hover:from-indigo-300 hover:to-indigo-500 focus:ring-4 focus:ring-indigo-500/25",
    secondary: "bg-white/[0.07] text-white/90 border border-white/[0.10] font-medium hover:bg-white/[0.13] hover:border-white/[0.18] focus:ring-4 focus:ring-white/10",
    danger:    "bg-gradient-to-b from-rose-400 to-rose-600 text-white font-semibold shadow-[0_8px_20px_-8px_rgba(244,63,94,0.4)] hover:from-rose-300 hover:to-rose-500 focus:ring-4 focus:ring-rose-500/25",
    ghost:     "text-white/70 font-medium hover:bg-white/[0.07] hover:text-white focus:ring-4 focus:ring-white/10",
  }[variant];

  return (
    <button {...props} className={clsx(
      "inline-flex items-center justify-center gap-2 outline-none",
      "transition-all duration-150 active:scale-[0.97] active:translate-y-px",
      "disabled:opacity-50 disabled:pointer-events-none",
      sizeStyles, variantStyles, props.className
    )} />
  );
}

/* ─── Badge ─────────────────────────────────────── */
export function Badge({ tone = "neutral", dot, children }: {
  tone?: "neutral"|"success"|"danger"|"info"|"warning"; dot?: boolean; children: React.ReactNode;
}) {
  const styles = {
    neutral: "border-white/10   bg-white/[0.07]   text-white/75",
    success: "border-emerald-500/25 bg-emerald-500/12 text-emerald-300",
    danger:  "border-rose-500/25    bg-rose-500/12    text-rose-300",
    info:    "border-indigo-500/25  bg-indigo-500/12  text-indigo-300",
    warning: "border-amber-500/25   bg-amber-500/12   text-amber-300",
  }[tone];
  const dotColor = {
    neutral: "bg-white/40", success: "bg-emerald-400", danger: "bg-rose-400",
    info: "bg-indigo-400", warning: "bg-amber-400",
  }[tone];
  return (
    <span className={clsx(
      "inline-flex items-center gap-1.5 rounded-full border px-2 py-[2px] text-[11px] font-medium tracking-wide",
      styles
    )}>
      {dot && <span className={clsx("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />}
      {children}
    </span>
  );
}

/* ─── Divider ───────────────────────────────────── */
export function Divider({ label }: { label?: string }) {
  if (!label) return <div className="h-px bg-white/[0.07]" />;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-white/[0.07]" />
      <span className="text-xs text-white/35 font-medium">{label}</span>
      <div className="flex-1 h-px bg-white/[0.07]" />
    </div>
  );
}

/* ─── EmptyState ────────────────────────────────── */
export function EmptyState({ icon, title, description }: {
  icon?: string; title: string; description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
      {icon && <div className="text-3xl sm:text-4xl mb-3 opacity-60">{icon}</div>}
      <p className="text-sm font-medium text-white/60">{title}</p>
      {description && <p className="mt-1 text-xs text-white/35 max-w-xs leading-relaxed">{description}</p>}
    </div>
  );
}
