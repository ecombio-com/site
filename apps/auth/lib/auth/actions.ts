"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";
import { issueCode, consumeCode } from "./otp";
import { sendLoginCode } from "./email";
import { createSession, destroySession } from "./session";
import { findOrCreateCustomer } from "@/lib/shopify/customers";

export type ActionResult = { ok: true } | { ok: false; error: string };

let limiters:
  | { sendEmail: Ratelimit; sendIp: Ratelimit; verifyEmail: Ratelimit; verifyIp: Ratelimit }
  | undefined;

function getLimiters() {
  if (limiters) return limiters;
  const redis = getRedis();
  limiters = {
    sendEmail: new Ratelimit({ redis, prefix: "rl:send:email", limiter: Ratelimit.slidingWindow(5, "1 h") }),
    sendIp: new Ratelimit({ redis, prefix: "rl:send:ip", limiter: Ratelimit.slidingWindow(20, "1 h") }),
    verifyEmail: new Ratelimit({ redis, prefix: "rl:verify:email", limiter: Ratelimit.slidingWindow(10, "15 m") }),
    verifyIp: new Ratelimit({ redis, prefix: "rl:verify:ip", limiter: Ratelimit.slidingWindow(30, "15 m") }),
  };
  return limiters;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  // On Vercel, x-forwarded-for's first entry is the real client IP.
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

function normalizeEmail(raw: string): string | null {
  const email = String(raw ?? "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export async function requestLoginCode(rawEmail: string): Promise<ActionResult> {
  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, error: "Enter a valid email address." };

  const l = getLimiters();
  const ip = await clientIp();
  const [byEmail, byIp] = await Promise.all([l.sendEmail.limit(email), l.sendIp.limit(ip)]);
  if (!byEmail.success || !byIp.success) {
    return { ok: false, error: "Too many requests. Please try again later." };
  }

  try {
    const code = await issueCode(email);
    await sendLoginCode(email, code);
  } catch (err) {
    console.error("requestLoginCode failed:", err);
    return { ok: false, error: "We couldn't send the code. Please try again." };
  }
  return { ok: true };
}

export async function verifyLoginCode(rawEmail: string, rawCode: string): Promise<ActionResult> {
  const email = normalizeEmail(rawEmail);
  const code = String(rawCode ?? "").trim();
  if (!email || !/^\d{6}$/.test(code)) return { ok: false, error: "Enter the 6-digit code." };

  const l = getLimiters();
  const ip = await clientIp();
  const [byEmail, byIp] = await Promise.all([l.verifyEmail.limit(email), l.verifyIp.limit(ip)]);
  if (!byEmail.success || !byIp.success) {
    return { ok: false, error: "Too many attempts. Please try again later." };
  }

  if (!(await consumeCode(email, code))) {
    return { ok: false, error: "That code is invalid or has expired." };
  }

  try {
    // Email ownership is now proven, so it's safe to link to a Shopify customer.
    const customer = await findOrCreateCustomer(email);
    await createSession({ customerId: customer.id, email });
  } catch (err) {
    console.error("verifyLoginCode failed:", err);
    return { ok: false, error: "Something went wrong signing you in. Request a new code and try again." };
  }
  return { ok: true };
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}
