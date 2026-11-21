import { createHmac, timingSafeEqual } from "node:crypto";

// Backstop for buyers who close the popup right after paying.
// Register an "orders/paid" webhook pointing at /api/webhooks/shopify/orders-paid
// (in the Dev Dashboard app's version config, or via the Admin API).
export async function POST(req: Request) {
  const raw = await req.text();
  const sent = req.headers.get("x-shopify-hmac-sha256") ?? "";
  const expected = createHmac("sha256", process.env.SHOPIFY_CLIENT_SECRET!).update(raw).digest("base64");

  const a = Buffer.from(sent);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response("invalid signature", { status: 401 });
  }

  const order = JSON.parse(raw) as { admin_graphql_api_id: string; email?: string; name?: string };

  // TODO: do your post-purchase work here, idempotently (Shopify can deliver a webhook twice):
  //  - dedupe on req.headers.get("x-shopify-event-id") with an Upstash SET NX
  //  - send your own confirmation email via Resend
  //  - clear any server-side cart state
  console.log("orders/paid", order.name, order.admin_graphql_api_id);

  return new Response("ok", { status: 200 });
}
