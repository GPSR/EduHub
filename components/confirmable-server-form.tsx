"use client";

export function ConfirmableServerForm({
  action,
  className,
  confirmMessage,
  enabled = true,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  confirmMessage: string;
  enabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        if (!enabled) return;
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
