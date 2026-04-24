"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function releaseScrollLock() {
  const html = document.documentElement;
  const body = document.body;
  body.dataset.scrollLockCount = "0";
  html.style.overflow = "";
  body.style.overflow = "";
}

export function ScrollUnlocker() {
  const pathname = usePathname();

  useEffect(() => {
    releaseScrollLock();
  }, []);

  useEffect(() => {
    releaseScrollLock();
  }, [pathname]);

  useEffect(() => {
    const onPageShow = () => releaseScrollLock();
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
