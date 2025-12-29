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

  await transport.sendMail({
    from,
    to,
    subject: "Reset your SecureStory password",
    text: `Reset link:\n${resetUrl}\n\nIf you didn’t request this, ignore this email.`,
  });
}
