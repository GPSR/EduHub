"use client";

import { useEffect } from "react";

function keyForCurrentPage() {
  return `eduhub:scroll:${window.location.pathname}${window.location.search}`;
}

export function ScrollPreserver() {
  useEffect(() => {
    const storageKey = keyForCurrentPage();
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      const y = Number(saved);
      if (Number.isFinite(y) && y > 0) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: y, behavior: "auto" });
        });
      }
      sessionStorage.removeItem(storageKey);
    }

    const onSubmit = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLFormElement)) return;
      if (target.target && target.target !== "_self") return;
      sessionStorage.setItem(storageKey, String(window.scrollY));
    };

    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  return null;
}
