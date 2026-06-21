import { Resend } from 'resend'

/**
 * Email sending via Resend.
 *
 * Set these in your environment (Vercel project settings / .env):
 *   RESEND_API_KEY = re_xxxxxxxx          (from https://resend.com)
 *   EMAIL_FROM     = "BookMeBz <no-reply@bookme.bz>"
 *
 * If RESEND_API_KEY is not set, emails are logged to the server console
 * instead of being sent — so local development still works without a key.
 */

const apiKey = process.env.RESEND_API_KEY
const from = process.env.EMAIL_FROM || 'BookMeBz <onboarding@resend.dev>'

const resend = apiKey ? new Resend(apiKey) : null

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<{ sent: boolean }> {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY not set — would have sent "${opts.subject}" to ${opts.to}`
    )
    console.warn(`[email] body:\n${opts.html}`)
    return { sent: false }
  }

  try {
    await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    })
    return { sent: true }
  } catch (error) {
    console.error('[email] Resend send failed:', error)
    return { sent: false }
  }
}

export function passwordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: 'Reset your BookMeBz password',
    html: `
      <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #db2777; margin-bottom: 8px;">Reset your password</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          We received a request to reset the password for your BookMeBz account.
          Click the button below to choose a new password. This link expires in 1 hour.
        </p>
        <p style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}"
             style="background: #db2777; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block;">
            Reset password
          </a>
        </p>
        <p style="color: #64748b; font-size: 12px; line-height: 1.6;">
          If you didn't request this, you can safely ignore this email. The link
          below also works:<br>
          <a href="${resetUrl}" style="color: #db2777; word-break: break-all;">${resetUrl}</a>
        </p>
      </div>
    `,
  }
}
