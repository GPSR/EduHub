import { prisma } from "@/lib/db";
import { hashToken, randomToken } from "@/lib/token";
import { sendTransactionalEmail } from "@/lib/mailer";
import { resolvePlatformAppBaseUrl, resolveSchoolAppBaseUrl } from "@/lib/app-env";

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function resolveAppBaseUrl(subjectType: "PLATFORM_USER" | "SCHOOL_USER") {
  if (subjectType === "PLATFORM_USER") {
    return resolvePlatformAppBaseUrl();
  }
  return resolveSchoolAppBaseUrl();
}

export async function createPasswordResetToken(args: {
  subjectType: "PLATFORM_USER" | "SCHOOL_USER";
  platformUserId?: string;
  userId?: string;
  schoolId?: string;
  email: string;
}) {
  const token = randomToken(24);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const now = new Date();

  await prisma.passwordResetToken.updateMany({
    where:
      args.subjectType === "PLATFORM_USER"
        ? {
            subjectType: "PLATFORM_USER",
            platformUserId: args.platformUserId,
            usedAt: null
          }
        : {
            subjectType: "SCHOOL_USER",
            userId: args.userId,
            usedAt: null
          },
    data: { usedAt: now }
  });

  await prisma.passwordResetToken.create({
    data: {
      token: tokenHash,
      subjectType: args.subjectType,
      platformUserId: args.platformUserId,
      userId: args.userId,
      schoolId: args.schoolId,
      email: args.email.toLowerCase(),
      expiresAt
    }
  });
  return { token, expiresAt };
}

export async function sendPasswordResetEmail(args: {
  subjectType: "PLATFORM_USER" | "SCHOOL_USER";
  toEmail: string;
  recipientName: string;
  resetToken: string;
  expiresAt: Date;
}) {
  const baseUrl = resolveAppBaseUrl(args.subjectType);
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(args.resetToken)}`;
  const expiresText = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(args.expiresAt);

  const subject = "EduHub password reset link";
  const text = [
    `Hello ${args.recipientName},`,
    "",
    "A password reset was requested for your EduHub account.",
    "Use this secure link to set a new password:",
    resetUrl,
    "",
    `This link expires at ${expiresText} (about 30 minutes).`,
    "If you did not request this, ignore this email."
  ].join("\n");
  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;max-width:620px;margin:0 auto;">
    <h2 style="margin:0 0 12px;">Password reset requested</h2>
    <p style="margin:0 0 12px;">Hello <strong>${escapeHtml(args.recipientName)}</strong>,</p>
    <p style="margin:0 0 14px;">A password reset was requested for your EduHub account.</p>
    <p style="margin:0 0 16px;">
      <a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
        Reset Password
      </a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#334155;">Or copy this URL:</p>
    <p style="margin:0 0 16px;font-size:13px;word-break:break-all;color:#1e3a8a;">${escapeHtml(resetUrl)}</p>
    <p style="margin:0 0 4px;font-size:13px;color:#334155;">This link expires at <strong>${escapeHtml(expiresText)}</strong> (about 30 minutes).</p>
    <p style="margin:0;font-size:12px;color:#64748b;">If you did not request this, ignore this email.</p>
  </div>`;

  return sendTransactionalEmail({
    to: args.toEmail.toLowerCase(),
    subject,
    text,
    html
  });
}
