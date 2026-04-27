import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/token";
import { ResetPasswordForm } from "./ui";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/80">
          Invalid or missing reset link.
        </div>
      </div>
    );
  }

  const tokenHash = hashToken(token);
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      OR: [{ token }, { token: tokenHash }]
    },
    select: { id: true, usedAt: true, expiresAt: true }
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-5 text-sm text-rose-100">
          This reset link is invalid or expired.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <ResetPasswordForm token={token} />
    </div>
  );
}
