import "server-only";
import { getSession } from "@/lib/auth/session";
import { getCartIdFromCookie } from "@/lib/cart/server";

export { adminGraphql } from "@/lib/shopify/admin";

/** Cart GID from the Hydrogen cart cookie, or null if there is no cart. */
export async function getCartId(): Promise<string | null> {
  return (await getCartIdFromCookie()) ?? null;
}

/** Email of the signed-in customer, or null for guests. */
export async function getSessionEmail(): Promise<string | null> {
  return (await getSession())?.email ?? null;
}
