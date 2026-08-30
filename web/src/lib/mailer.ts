import nodemailer from "nodemailer";

function transport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) throw new Error("SMTP is not configured");
  return nodemailer.createTransport({ host, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_SECURE === "true", auth: { user, pass } });
}

export async function sendAccountEmail(to: string, subject: string, actionUrl: string, action: string) {
  const from = process.env.SMTP_FROM;
  if (!from) throw new Error("SMTP_FROM is not configured");
  await transport().sendMail({
    from, to, subject,
    text: `${action}: ${actionUrl}\n\nThis link expires soon. If you did not request it, ignore this email.`,
    html: `<p>${action}</p><p><a href="${actionUrl.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}">${action}</a></p><p>This link expires soon. If you did not request it, ignore this email.</p>`,
  });
}

export function publicAppUrl(path: string, token: string) {
  const base = process.env.PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL(path, base);
  url.searchParams.set("token", token);
  return url.toString();
}
