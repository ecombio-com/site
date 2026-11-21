import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { getRedis } from "./redis";
import { need } from "./env";

const CODE_TTL_SECONDS = 10 * 60;
const MAX_ATTEMPTS = 5;

const codeKey = (email: string) => `otp:code:${email}`;
const attemptsKey = (email: string) => `otp:attempts:${email}`;

function hashCode(email: string, code: string): Buffer {
  return createHmac("sha256", need("AUTH_SECRET")).update(`${email}:${code}`).digest();
}

/** Creates a 6-digit code, stores only its HMAC, returns the plaintext to email. */
export async function issueCode(email: string): Promise<string> {
  const redis = getRedis();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await redis.del(attemptsKey(email));
  // "h:" prefix stops Upstash from auto-JSON-parsing a numeric-looking value.
  await redis.set(codeKey(email), `h:${hashCode(email, code).toString("hex")}`, {
    ex: CODE_TTL_SECONDS,
  });
  return code;
}

/** Single-use: returns true at most once per issued code. */
export async function consumeCode(email: string, code: string): Promise<boolean> {
  const redis = getRedis();

  // Atomic attempt counter, so parallel guesses can't exceed the limit.
  const attempts = await redis.incr(attemptsKey(email));
  if (attempts === 1) await redis.expire(attemptsKey(email), CODE_TTL_SECONDS);
  if (attempts > MAX_ATTEMPTS) {
    await redis.del(codeKey(email));
    return false;
  }

  const stored = await redis.get<string>(codeKey(email));
  if (typeof stored !== "string" || !stored.startsWith("h:")) return false;

  const expected = Buffer.from(stored.slice(2), "hex");
  const actual = hashCode(email, code);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;

  // DEL returns 1 only for the request that actually removed it.
  const deleted = await redis.del(codeKey(email));
  if (deleted === 1) await redis.del(attemptsKey(email));
  return deleted === 1;
}
