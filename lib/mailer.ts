import nodemailer from "nodemailer";

export async function sendTransactionalEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const pickEnv = (...keys: string[]) => {
    for (const key of keys) {
      const value = process.env[key];
      if (value && value.trim().length > 0) return value.trim();
    }
    return undefined;
  };

  const smtpUser = pickEnv("SMTP_USER", "ZOHO_SMTP_USER");
  const smtpPass = pickEnv("SMTP_PASS", "ZOHO_SMTP_PASS");
  const smtpHost = pickEnv("SMTP_HOST", "ZOHO_SMTP_HOST") ?? "smtp.zoho.com";
  const smtpPort = Number(pickEnv("SMTP_PORT", "ZOHO_SMTP_PORT") ?? "465");
  const smtpSecureEnv = pickEnv("SMTP_SECURE", "ZOHO_SMTP_SECURE");
  const smtpSecure =
    smtpSecureEnv === undefined
      ? smtpPort === 465
      : smtpSecureEnv.toLowerCase() !== "false";
  const smtpFrom =
    pickEnv("SMTP_FROM_EMAIL", "EMAIL_FROM", "MAIL_FROM", "ZOHO_FROM_EMAIL") ??
    pickEnv("RESEND_FROM_EMAIL") ??
    smtpUser;

  const resendApiKey = pickEnv("RESEND_API_KEY");
  const resendFrom = pickEnv("RESEND_FROM_EMAIL", "EMAIL_FROM", "MAIL_FROM");

  const attemptSmtp = async () => {
    if (!smtpUser || !smtpPass || !smtpFrom) {
      return { sent: false as const, reason: "smtp_not_configured" as const };
    }
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: { user: smtpUser, pass: smtpPass }
      });
      await transporter.sendMail({
        from: smtpFrom,
        to: args.to,
        subject: args.subject,
        text: args.text,
        html: args.html
      });
      return { sent: true as const, provider: "smtp" as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : "smtp_send_failed";
      return { sent: false as const, reason: `smtp_failed:${message}` as const };
    }
  };

  const attemptResend = async () => {
    if (!resendApiKey || !resendFrom) {
      return { sent: false as const, reason: "resend_not_configured" as const };
    }
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: resendFrom,
          to: [args.to],
          subject: args.subject,
          text: args.text,
          html: args.html
        })
      });
      if (!response.ok) {
        const body = await response.text();
        return { sent: false as const, reason: `resend_failed:${response.status}:${body}` as const };
      }
      return { sent: true as const, provider: "resend" as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : "resend_send_failed";
      return { sent: false as const, reason: `resend_failed:${message}` as const };
    }
  };

  const smtpResult = await attemptSmtp();
  if (smtpResult.sent) return smtpResult;

  const resendResult = await attemptResend();
  if (resendResult.sent) return resendResult;

  const smtpReason = smtpResult.reason;
  const resendReason = resendResult.reason;
  if (
    (smtpReason === "smtp_not_configured" || !smtpReason) &&
    (resendReason === "resend_not_configured" || !resendReason)
  ) {
    return { sent: false as const, reason: "email_provider_not_configured" as const };
  }

  return {
    sent: false as const,
    reason: `${smtpReason ?? "smtp_unavailable"}|${resendReason ?? "resend_unavailable"}` as const
  };
}
