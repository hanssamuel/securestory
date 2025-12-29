import nodemailer from "nodemailer";

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function sendResetEmail(to: string, resetUrl: string) {
  const host = must("SMTP_HOST");
  const port = Number(must("SMTP_PORT"));
  const user = must("SMTP_USER");
  const pass = must("SMTP_PASS");
  const from = must("SMTP_FROM");

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const subject = "Reset your SecureStory password";
  const text =
`Someone requested a password reset for your SecureStory account.

Reset link:
${resetUrl}

If you didn’t request this, ignore this email. This link expires soon.`;

  await transport.sendMail({
    from,
    to,
    subject,
    text,
  });
}
