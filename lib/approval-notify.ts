import { sendTransactionalEmail } from "@/lib/mailer";

export type InviteNotifyResult = {
  emailSent: boolean;
  smsSent: boolean;
  errors: string[];
};

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function buildInviteEmail(args: { schoolName: string; inviteUrl: string; expiresAt?: Date }) {
  const schoolName = escapeHtml(args.schoolName);
  const inviteUrl = escapeHtml(args.inviteUrl);
  const expiresText = args.expiresAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }).format(args.expiresAt)
    : "soon";

  const text = [
    `Your school onboarding has been approved for ${args.schoolName}.`,
    "",
    "Create your admin account using this secure link:",
    args.inviteUrl,
    "",
    `This invite expires on ${expiresText}.`,
    "If you did not request this, ignore this email."
  ].join("\n");

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;max-width:620px;margin:0 auto;">
    <h2 style="margin:0 0 12px;">EduHub onboarding approved</h2>
    <p style="margin:0 0 12px;">Your school onboarding has been approved for <strong>${schoolName}</strong>.</p>
    <p style="margin:0 0 16px;">Use the secure link below to create your admin account:</p>
    <p style="margin:0 0 20px;">
      <a href="${inviteUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
        Activate Admin Account
      </a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#334155;">Or copy this URL:</p>
    <p style="margin:0 0 16px;font-size:13px;word-break:break-all;color:#1e3a8a;">${inviteUrl}</p>
    <p style="margin:0 0 4px;font-size:13px;color:#334155;">This invite expires on <strong>${escapeHtml(expiresText)}</strong>.</p>
    <p style="margin:0;font-size:12px;color:#64748b;">If you did not request this, you can ignore this email.</p>
  </div>`;

  return { text, html };
}

async function sendApprovalEmail(args: {
  to: string;
  schoolName: string;
  inviteUrl: string;
  expiresAt?: Date;
}) {
  const content = buildInviteEmail({
    schoolName: args.schoolName,
    inviteUrl: args.inviteUrl,
    expiresAt: args.expiresAt
  });
  return sendTransactionalEmail({
    to: args.to,
    subject: `EduHub onboarding approved | ${args.schoolName}`,
    text: content.text,
    html: content.html
  });
}

async function sendApprovalSms(args: { inviteUrl: string; adminPhone?: string | null }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const to = args.adminPhone || process.env.TWILIO_DEFAULT_TO;

  if (!sid || !token || !from || !to) {
    return { sent: false, reason: "twilio_not_configured" } as const;
  }

  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: `EduHub onboarding approved. Create admin account: ${args.inviteUrl}`
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`twilio_failed:${response.status}:${txt}`);
  }

  return { sent: true } as const;
}

export async function sendOnboardingApprovalNotifications(args: {
  schoolName: string;
  adminEmail: string;
  adminPhone?: string | null;
  inviteUrl: string;
  expiresAt?: Date;
}): Promise<InviteNotifyResult> {
  const result: InviteNotifyResult = { emailSent: false, smsSent: false, errors: [] };

  try {
    const email = await sendApprovalEmail({
      to: args.adminEmail,
      schoolName: args.schoolName,
      inviteUrl: args.inviteUrl,
      expiresAt: args.expiresAt
    });
    result.emailSent = email.sent;
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : "email_send_failed");
  }

  try {
    const sms = await sendApprovalSms({ inviteUrl: args.inviteUrl, adminPhone: args.adminPhone });
    result.smsSent = sms.sent;
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : "sms_send_failed");
  }

  return result;
}

export async function sendOnboardingRejectionEmail(args: {
  adminEmail: string;
  schoolName: string;
  note?: string | null;
}) {
  const subject = `EduHub onboarding update | ${args.schoolName}`;
  const text = [
    `Your school onboarding request for ${args.schoolName} was not approved at this time.`,
    args.note ? `Reason: ${args.note}` : "",
    "",
    "Please update the details and submit a new request."
  ].filter(Boolean).join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;max-width:620px;margin:0 auto;">
      <h2 style="margin:0 0 12px;">Onboarding request update</h2>
      <p style="margin:0 0 12px;">
        Your school onboarding request for <strong>${escapeHtml(args.schoolName)}</strong> was not approved at this time.
      </p>
      ${
        args.note
          ? `<p style="margin:0 0 12px;"><strong>Reason:</strong> ${escapeHtml(args.note)}</p>`
          : ""
      }
      <p style="margin:0;">Please update the details and submit a new request.</p>
    </div>
  `;

  return sendTransactionalEmail({ to: args.adminEmail, subject, text, html });
}

export async function sendOnboardingHoldEmail(args: {
  adminEmail: string;
  schoolName: string;
  note?: string | null;
}) {
  const subject = `EduHub onboarding on hold | ${args.schoolName}`;
  const text = [
    `Your school onboarding request for ${args.schoolName} is currently on hold.`,
    args.note ? `Note: ${args.note}` : "",
    "",
    "Our platform team may contact you for clarification before final approval."
  ].filter(Boolean).join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;max-width:620px;margin:0 auto;">
      <h2 style="margin:0 0 12px;">Onboarding status: On hold</h2>
      <p style="margin:0 0 12px;">
        Your school onboarding request for <strong>${escapeHtml(args.schoolName)}</strong> is currently on hold.
      </p>
      ${
        args.note
          ? `<p style="margin:0 0 12px;"><strong>Note:</strong> ${escapeHtml(args.note)}</p>`
          : ""
      }
      <p style="margin:0;">Our platform team may contact you for clarification before final approval.</p>
    </div>
  `;
  return sendTransactionalEmail({ to: args.adminEmail, subject, text, html });
}
