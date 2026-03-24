/**
 * Email service — plug in your provider (Resend, SendGrid, etc.)
 *
 * To set up:
 *   1. npm install resend (or your provider)
 *   2. Set EMAIL_FROM and RESEND_API_KEY in .env
 *   3. Replace the sendEmail implementation below
 */

const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@comeoffline.in";

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  // TODO: Replace with your email provider
  // Example with Resend:
  //   const resend = new Resend(process.env.RESEND_API_KEY);
  //   await resend.emails.send({ from: EMAIL_FROM, ...opts });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[email] DEV MODE — would send to ${opts.to}:`);
    console.log(`  Subject: ${opts.subject}`);
    console.log(`  Body: ${opts.text}`);
    return true;
  }

  // In production without a provider configured, log a warning
  console.warn(`[email] No email provider configured! Email to ${opts.to} not sent.`);
  console.warn(`[email] Set up Resend/SendGrid and update apps/api/src/services/email.service.ts`);
  return false;
}

/** Send a PIN reset code */
export async function sendPinResetEmail(to: string, code: string, userName: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: "come offline — reset your PIN",
    text: `hey ${userName},\n\nyour PIN reset code is: ${code}\n\nit expires in 10 minutes. if you didn't request this, just ignore it.\n\n— come offline`,
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 32px; background: #0E0D0B; color: #FAF6F0; border-radius: 16px;">
        <h2 style="font-family: serif; font-weight: normal; margin: 0 0 8px;">come offline</h2>
        <p style="color: #9B8E82; font-size: 13px; margin: 0 0 24px;">PIN reset</p>
        <p>hey ${userName},</p>
        <p>your reset code is:</p>
        <div style="background: #1a1917; border-radius: 12px; padding: 16px; text-align: center; margin: 16px 0;">
          <span style="font-family: monospace; font-size: 32px; letter-spacing: 8px; color: #D4A574;">${code}</span>
        </div>
        <p style="color: #9B8E82; font-size: 12px;">expires in 10 minutes. if you didn&rsquo;t request this, ignore it.</p>
      </div>
    `,
  });
}
