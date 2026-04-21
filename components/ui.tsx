import { clsx } from "clsx";

export function Card({
  title,
  description,
  children
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white/[0.05] border border-white/10 p-6 shadow-[0_20px_60px_-44px_rgba(0,0,0,0.9)] backdrop-blur hover:bg-white/[0.06] transition">
      {title ? (
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description ? <div className="mt-1 text-sm text-white/60">{description}</div> : null}
        </div>
      ) : null}
      <div className={clsx(title ? "mt-4" : "")}>{children}</div>
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-white/70">{children}</div>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "mt-1 w-full rounded-2xl bg-black/20 border border-white/10 px-3.5 py-2.5 outline-none",
        "focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15 transition",
        "placeholder:text-white/35",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "mt-1 w-full rounded-2xl bg-black/20 border border-white/10 px-3.5 py-2.5 outline-none",
        "focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15 transition",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "mt-1 w-full rounded-2xl bg-black/20 border border-white/10 px-3.5 py-2.5 outline-none",
        "focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15 transition",
        "placeholder:text-white/35",
        props.className
      )}
    />
  );
}

export function Button({
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const base =
    "px-4 py-2.5 rounded-2xl disabled:opacity-60 transition border border-transparent active:translate-y-[1px] focus:outline-none focus:ring-4 focus:ring-indigo-500/20";
  const styles =
    variant === "primary"
      ? "bg-gradient-to-b from-indigo-400 to-indigo-600 hover:from-indigo-300 hover:to-indigo-500 text-white shadow-[0_12px_30px_-18px_rgba(99,102,241,0.65)]"
      : variant === "danger"
        ? "bg-gradient-to-b from-rose-400 to-rose-600 hover:from-rose-300 hover:to-rose-500 text-white shadow-[0_12px_30px_-18px_rgba(244,63,94,0.45)] focus:ring-rose-500/20"
        : "bg-white/10 hover:bg-white/15 text-white border-white/10 focus:ring-white/10";
  return <button {...props} className={clsx(base, styles, props.className)} />;
}

export function Badge({
  tone = "neutral",
  children
}: {
  tone?: "neutral" | "success" | "danger" | "info";
  children: React.ReactNode;
}) {
  const styles =
    tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
      : tone === "danger"
        ? "border-rose-500/30 bg-rose-500/15 text-rose-200"
        : tone === "info"
          ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
          : "border-white/10 bg-white/5 text-white/80";
  return (
    <span className={clsx("inline-flex items-center rounded-full border px-2.5 py-1 text-xs", styles)}>
      {children}
    </span>
  );
}
