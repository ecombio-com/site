import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { need } from "./env";

const COOKIE_NAME = "acct_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type Session = {
  /** Shopify customer GID, e.g. gid://shopify/Customer/123 */
  customerId: string;
  email: string;
};

function secretKey(): Uint8Array {
  const secret = need("AUTH_SECRET");
  if (secret.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters");
  return new TextEncoder().encode(secret);
}

/** Call only from a Server Action or Route Handler. */
export async function createSession(session: Session): Promise<void> {
  const token = await new SignJWT({ email: session.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.customerId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Call only from a Server Action or Route Handler. */
export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.email !== "string") return null;
    return { customerId: payload.sub, email: payload.email };
  } catch {
    return null;
  }
});

/** Use at the top of any protected Server Component / action. */
export async function requireSession(next = "/account"): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session;
}
