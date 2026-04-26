"use client";

type CheckboxBulkActionsProps = {
  fieldName: string;
  selectLabel?: string;
  clearLabel?: string;
  className?: string;
};

function setCheckboxGroupValue(button: HTMLButtonElement, fieldName: string, checked: boolean) {
  const form = button.form;
  if (!form) return;

  const boxes = form.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="${fieldName}"]`);
  boxes.forEach((box) => {
    if (box.disabled) return;
    box.checked = checked;
  });
}

export function CheckboxBulkActions({
  fieldName,
  selectLabel = "Select all",
  clearLabel = "Clear",
  className
}: CheckboxBulkActionsProps) {
  return (
    <div className={className ?? "mb-2 flex items-center gap-2"}>
      <button
        type="button"
        onClick={(event) => setCheckboxGroupValue(event.currentTarget, fieldName, true)}
        className="rounded-[8px] border border-white/[0.14] bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/75 transition hover:bg-white/[0.10] hover:text-white"
      >
        {selectLabel}
      </button>
      <button
        type="button"
        onClick={(event) => setCheckboxGroupValue(event.currentTarget, fieldName, false)}
        className="rounded-[8px] border border-white/[0.14] bg-white/[0.02] px-2.5 py-1 text-[11px] font-medium text-white/60 transition hover:bg-white/[0.08] hover:text-white/90"
      >
        {clearLabel}
      </button>
    </div>
  );
}
