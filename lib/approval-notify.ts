export type InviteNotifyResult = {
  emailSent: boolean;
  smsSent: boolean;
  errors: string[];
};

async function sendApprovalEmail(args: {
  to: string;
  schoolName: string;
  inviteUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { sent: false, reason: "resend_not_configured" } as const;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [args.to],
      subject: `EduHub onboarding approved - ${args.schoolName}`,
      text: [
        `Your school onboarding has been approved for ${args.schoolName}.`,
        "",
        "Use this link to create your admin account:",
        args.inviteUrl,
        "",
        "This invite may expire soon."
      ].join("\n")
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`resend_failed:${response.status}:${body}`);
  }

  return { sent: true } as const;
}

async function sendApprovalSms(args: { inviteUrl: string }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const to = process.env.TWILIO_DEFAULT_TO;

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
  inviteUrl: string;
}): Promise<InviteNotifyResult> {
  const result: InviteNotifyResult = { emailSent: false, smsSent: false, errors: [] };

  try {
    const email = await sendApprovalEmail({
      to: args.adminEmail,
      schoolName: args.schoolName,
      inviteUrl: args.inviteUrl
    });
    result.emailSent = email.sent;
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : "email_send_failed");
  }

  try {
    const sms = await sendApprovalSms({ inviteUrl: args.inviteUrl });
    result.smsSent = sms.sent;
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : "sms_send_failed");
  }

  return result;
}
