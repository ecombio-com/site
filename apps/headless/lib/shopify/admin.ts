import "server-only";
import { getRedis } from "@/lib/auth/redis";
import { need } from "@/lib/auth/env";

const TOKEN_CACHE_KEY = "shopify:admin-token";

async function requestNewToken(): Promise<{ token: string; ttl: number }> {
  const res = await fetch(`https://${need("SHOPIFY_STORE_DOMAIN")}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: need("SHOPIFY_CLIENT_ID"),
      client_secret: need("SHOPIFY_CLIENT_SECRET"),
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Shopify token request failed (${res.status})`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  return { token: json.access_token, ttl: json.expires_in };
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  // Legacy custom app (created before 2026-01-01): static, non-expiring token.
  if (process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) return process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  const redis = getRedis();
  if (!forceRefresh) {
    const cached = await redis.get<string>(TOKEN_CACHE_KEY);
    if (cached) return cached;
  }
  const { token, ttl } = await requestNewToken();
  // Expire the cache entry 5 minutes before Shopify expires the token.
  await redis.set(TOKEN_CACHE_KEY, token, { ex: Math.max(ttl - 300, 60) });
  return token;
}

export async function adminGraphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const url = `https://${need("SHOPIFY_STORE_DOMAIN")}/admin/api/${need("SHOPIFY_ADMIN_API_VERSION")}/graphql.json`;

  const run = (token: string) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });

  let res = await run(await getAccessToken());
  if (res.status === 401 && !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
    res = await run(await getAccessToken(true));
  }
  if (!res.ok) throw new Error(`Shopify Admin API request failed (${res.status})`);

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(`Shopify Admin API error: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) throw new Error("Shopify Admin API returned no data");
  return json.data;
}
