import nodemailer from "nodemailer";

/**
 * Create a Nodemailer transport based on environment variables.
 *
 * Configure via:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * If SMTP_HOST is not set, uses a JSON transport (logs to console)
 * which is useful for development/testing.
 */
function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  // Development fallback: logs email to console via JSON transport
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

const transporter = createTransport();

const DEFAULT_FROM =
  process.env.SMTP_FROM || "PDI Feedback HR <noreply@pdi-feedback.local>";

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Send an email. Returns true on success, false on failure.
 * In development (no SMTP_HOST), logs the email to console.
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const result = await transporter.sendMail({
      from: DEFAULT_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    // JSON transport returns the message in result.message
    if (!process.env.SMTP_HOST) {
      console.log("[Email Dev] Would send:", JSON.stringify({
        to: options.to,
        subject: options.subject,
      }));
    }

    return !!result;
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
    return false;
  }
}
