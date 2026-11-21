import "server-only";
import { Redis } from "@upstash/redis";

let client: Redis | undefined;

// Lazy so a missing env var doesn't break `next build`.
export function getRedis(): Redis {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Missing Redis env vars (KV_REST_API_URL/KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL/TOKEN)",
    );
  }
  client = new Redis({ url, token });
  return client;
}
