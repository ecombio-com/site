import "server-only";
import { Resend } from "resend";
import { need } from "./env";

export async function sendLoginCode(to: string, code: string): Promise<void> {
  const resend = new Resend(need("RESEND_API_KEY"));
  const { error } = await resend.emails.send({
    from: need("AUTH_EMAIL_FROM"),
    to,
    subject: `Your sign-in code: ${code}`,
    text: `Your sign-in code is ${code}.\n\nIt expires in 10 minutes. If you didn't request it, you can ignore this email.`,
    html: `<p>Your sign-in code is</p><p style="font-size:28px;font-weight:600;letter-spacing:4px">${code}</p><p>It expires in 10 minutes. If you didn't request it, you can ignore this email.</p>`,
  });
  if (error) throw new Error(`Failed to send login email: ${error.message}`);
}
