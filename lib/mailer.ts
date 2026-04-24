import nodemailer from "nodemailer";

export async function sendTransactionalEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const zohoUser = process.env.ZOHO_SMTP_USER;
  const zohoPass = process.env.ZOHO_SMTP_PASS;
  const zohoHost = process.env.ZOHO_SMTP_HOST || "smtp.zoho.com";
  const zohoPort = Number(process.env.ZOHO_SMTP_PORT || 465);
  const zohoSecure = (process.env.ZOHO_SMTP_SECURE || "true").toLowerCase() !== "false";
  const zohoFrom = process.env.ZOHO_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || zohoUser;

  if (zohoUser && zohoPass && zohoFrom) {
    const transporter = nodemailer.createTransport({
      host: zohoHost,
      port: zohoPort,
      secure: zohoSecure,
      auth: { user: zohoUser, pass: zohoPass }
    });
    await transporter.sendMail({
      from: zohoFrom,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html
    });
    return { sent: true as const, provider: "zoho" as const };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { sent: false as const, reason: "email_provider_not_configured" as const };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [args.to],
      subject: args.subject,
      text: args.text,
      html: args.html
    })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`resend_failed:${response.status}:${body}`);
  }
  return { sent: true as const, provider: "resend" as const };
}
