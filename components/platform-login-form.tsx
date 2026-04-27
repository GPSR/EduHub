"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { platformLoginAction, type PlatformLoginState } from "@/app/platform/login/actions";
import { BiometricLoginButton } from "@/components/biometric-login-button";

const initialState: PlatformLoginState = { ok: true };

export function PlatformLoginForm() {
  const [state, action, pending] = useActionState(platformLoginAction, initialState);
  const onFocusCapture = (event: React.FocusEvent<HTMLFormElement>) => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 1024) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    window.setTimeout(() => {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 120);
  };

  return (
    <form action={action} onFocusCapture={onFocusCapture} className="space-y-3">
      <div>
        <Label>Email</Label>
        <Input name="email" type="email" required />
      </div>
      <div>
        <Label>Password</Label>
        <Input name="password" type="password" minLength={8} required />
      </div>
      <div className="flex justify-end -mt-1">
        <Link href="/platform/forgot-password" className="text-xs text-indigo-200/90 hover:text-indigo-100 underline-offset-2 hover:underline">
          Forgot password?
        </Link>
      </div>

      {!state.ok && state.message ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {state.message}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>

      <BiometricLoginButton scope="platform" />
    </form>
  );
}
