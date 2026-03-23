import { CustomMessageTriggerEvent } from "aws-lambda";

const BRAND = "InsightsOnAncestry";
const ACCENT = "#53bde3";

function emailTemplate(heading: string, body: string, code: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%">
        <!-- Logo bar -->
        <tr><td style="padding:0 0 24px 0">
          <span style="font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:bold;color:#ffffff">${BRAND}</span>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#0f0f0f;border:1px solid rgba(83,189,227,0.12);border-top:2px solid ${ACCENT};padding:40px 32px">
          <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:-0.5px">${heading}</h1>
          <p style="margin:0 0 28px 0;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.5)">${body}</p>
          <!-- Code box -->
          <div style="background:#0a0a0a;border:1px solid rgba(83,189,227,0.25);padding:20px;text-align:center;margin:0 0 28px 0">
            <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:${ACCENT};font-family:monospace">${code}</span>
          </div>
          <p style="margin:0;font-size:12px;line-height:1.6;color:rgba(255,255,255,0.3)">This code expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 0 0 0;text-align:center">
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2)">&copy; ${new Date().getFullYear()} ${BRAND}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const handler = async (event: CustomMessageTriggerEvent) => {
  const code = event.request.codeParameter;

  switch (event.triggerSource) {
    case "CustomMessage_SignUp":
      event.response.emailSubject = `${BRAND} — Verify your email`;
      event.response.emailMessage = emailTemplate(
        "Verify your email",
        "Welcome! Enter the code below to verify your account and get started.",
        code,
      );
      break;

    case "CustomMessage_ResendCode":
      event.response.emailSubject = `${BRAND} — Your new verification code`;
      event.response.emailMessage = emailTemplate(
        "New verification code",
        "Here's your new verification code. The previous code is no longer valid.",
        code,
      );
      break;

    case "CustomMessage_ForgotPassword":
      event.response.emailSubject = `${BRAND} — Reset your password`;
      event.response.emailMessage = emailTemplate(
        "Reset your password",
        "We received a request to reset your password. Enter the code below to proceed.",
        code,
      );
      break;
  }

  return event;
};
