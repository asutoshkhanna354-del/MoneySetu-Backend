import nodemailer from "nodemailer";
import { logger } from "./logger.js";

function createTransport() {
  const user = (process.env.EMAIL             || "").trim();
  const pass = (process.env.EMAIL_APP_PASSWORD || "").trim();
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 10000,
    socketTimeout: 10000,
    greetingTimeout: 10000,
  });
}

const OTP_HTML = (otp: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="height:6px;background:linear-gradient(90deg,#6d28d9,#a855f7,#6d28d9);"></td></tr>
        <tr>
          <td style="padding:32px 36px 20px;">
            <h1 style="margin:0 0 4px;font-size:28px;font-weight:800;color:#1a1035;">
              Money<span style="color:#7c3aed;">Setu</span>
            </h1>
            <p style="margin:0;font-size:11px;color:#888;letter-spacing:1.2px;text-transform:uppercase;">India's Smart Investment Platform</p>
          </td>
        </tr>
        <tr><td style="padding:0 36px;"><div style="height:1px;background:#eeeeee;"></div></td></tr>
        <tr>
          <td style="padding:28px 36px 8px;">
            <p style="margin:0 0 6px;font-size:16px;color:#222;font-weight:600;">Hello!</p>
            <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">
              Use the code below to verify your MoneySetu account. It expires in <strong style="color:#1a1035;">5 minutes</strong>.
            </p>
            <div style="background:#f5f0ff;border:2px solid #7c3aed;border-radius:16px;padding:28px 24px;text-align:center;margin-bottom:24px;">
              <p style="margin:0 0 8px;font-size:12px;color:#7c3aed;letter-spacing:2px;text-transform:uppercase;font-weight:700;">Verification Code</p>
              <span style="font-size:48px;font-weight:900;letter-spacing:12px;color:#6d28d9;">${otp}</span>
            </div>
            <p style="margin:0 0 28px;font-size:13px;color:#888;line-height:1.7;background:#fff8f0;border-left:3px solid #f59e0b;padding:10px 14px;border-radius:4px;">
              <strong style="color:#92400e;">Never share this code.</strong> MoneySetu will never ask for your verification code.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 36px 32px;">
            <div style="border-top:1px solid #eeeeee;padding-top:20px;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.7;">
                If you didn't request this code, you can safely ignore this email.<br>
                &copy; 2026 MoneySetu. All rights reserved.
              </p>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const subject = "Your MoneySetu verification code";
  const text    = `Your MoneySetu verification code is: ${otp}\n\nExpires in 5 minutes. Do not share it.`;

  const transport = createTransport();
  if (!transport) {
    logger.warn({ to }, `Email not configured — OTP for dev: ${otp}`);
    return;
  }

  try {
    const from = (process.env.EMAIL || "").trim();
    await transport.sendMail({ from: `"MoneySetu" <${from}>`, to, subject, html: OTP_HTML(otp), text });
    logger.info({ to }, "OTP email sent via SMTP");
  } catch (err: any) {
    logger.error({ err, to }, "SMTP send failed");
    throw new Error(`Email send failed: ${err?.message}`);
  }
}
