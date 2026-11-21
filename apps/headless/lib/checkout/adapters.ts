// The three places this code touches YOUR existing code. I haven't seen lib/cart,
// lib/auth/session.ts or lib/shopify/admin.ts, so wire these to what you already have.
import { cookies } from "next/headers";

/** Cart GID for the current visitor (e.g. "gid://shopify/Cart/..."). */
export async function getCartId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get("cartId")?.value ?? null; // TODO: use the cookie name lib/cart really uses
}

/** Email of the signed-in customer, or null for guests. */
export async function getSessionEmail(): Promise<string | null> {
  // TODO: replace with your session helper, e.g.
  // const s = await getSession(); return s?.email ?? null;
  return null;
}

/** Run an Admin API GraphQL query. */
export async function adminGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  // TODO: replace with the helper in lib/shopify/admin.ts (it already handles the client-credentials token).
  throw new Error("Wire adminGraphql to lib/shopify/admin.ts");
}
