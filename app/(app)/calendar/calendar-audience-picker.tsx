"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui";

type ClassOption = {
  id: string;
  name: string;
  section: string;
};

function classLabel(item: ClassOption) {
  return item.section ? `${item.name}-${item.section}` : item.name;
}

export function CalendarAudiencePicker({
  classes,
  initialAudienceScope = "SCHOOL_WIDE",
  initialClassIds = []
}: {
  classes: ClassOption[];
  initialAudienceScope?: "SCHOOL_WIDE" | "CLASS_WISE";
  initialClassIds?: string[];
}) {
  const normalizedInitialClassIds = useMemo(() => [...new Set(initialClassIds)], [initialClassIds.join("|")]);
  const [audienceScope, setAudienceScope] = useState<"SCHOOL_WIDE" | "CLASS_WISE">(initialAudienceScope);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(normalizedInitialClassIds);

  useEffect(() => {
    setAudienceScope(initialAudienceScope);
    setSelectedClassIds(normalizedInitialClassIds);
  }, [initialAudienceScope, normalizedInitialClassIds]);

  const classIds = useMemo(() => classes.map((item) => item.id), [classes]);
  const allSelected = classes.length > 0 && selectedClassIds.length === classes.length;

  const toggleClass = (classId: string, checked: boolean) => {
    setSelectedClassIds((current) => {
      if (checked) return current.includes(classId) ? current : current.concat(classId);
      return current.filter((id) => id !== classId);
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelectedClassIds(checked ? classIds : []);
  };

  return (
    <div className="space-y-2.5">
      <div>
        <Label required>Visibility</Label>
        <select
          name="audienceScope"
          value={audienceScope}
          onChange={(event) => {
            const value = event.target.value === "CLASS_WISE" ? "CLASS_WISE" : "SCHOOL_WIDE";
            setAudienceScope(value);
            if (value === "SCHOOL_WIDE") setSelectedClassIds([]);
          }}
          className="w-full rounded-[12px] border border-white/[0.12] bg-[#101b30] px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-300/70 focus:ring-4 focus:ring-blue-500/22"
        >
          <option value="SCHOOL_WIDE">School wide (all classes)</option>
          <option value="CLASS_WISE">Specific class(es)</option>
        </select>
      </div>

      {audienceScope === "CLASS_WISE" ? (
        <div className="rounded-[12px] border border-white/[0.12] bg-[#101b30] p-3">
          {classes.length > 0 ? (
            <div className="space-y-2.5">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-white/80">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => toggleAll(event.target.checked)}
                  className="h-4 w-4 rounded border-white/30 bg-[#0f1728]"
                />
                Select all classes
              </label>

              <div className="max-h-[180px] space-y-1.5 overflow-y-auto pr-1">
                {classes.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white/80 hover:bg-white/[0.08]"
                  >
                    <input
                      type="checkbox"
                      name="classIds"
                      value={item.id}
                      checked={selectedClassIds.includes(item.id)}
                      onChange={(event) => toggleClass(item.id, event.target.checked)}
                      className="h-4 w-4 rounded border-white/30 bg-[#0f1728]"
                    />
                    <span>{classLabel(item)}</span>
                  </label>
                ))}
              </div>

              {selectedClassIds.length === 0 ? (
                <p className="text-[11px] text-amber-100/70">Select at least one class for class-wise events.</p>
              ) : (
                <p className="text-[11px] text-white/50">{selectedClassIds.length} class(es) selected</p>
              )}
            </div>
          ) : (
            <p className="text-[12px] text-white/60">
              No classes are available yet. Add classes first or use school-wide visibility.
            </p>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-white/50">This event will be shown to all school users.</p>
      )}
    </div>
  );
}
