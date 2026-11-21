import { createHmac, timingSafeEqual } from "node:crypto";

function validSignature(raw: string, sent: string): boolean {
  const received = Buffer.from(sent, "base64");
  const secrets = [process.env.SHOPIFY_WEBHOOK_SECRET, process.env.SHOPIFY_CLIENT_SECRET].filter(
    (s): s is string => Boolean(s),
  );
  return secrets.some((secret) => {
    const expected = createHmac("sha256", secret).update(raw, "utf8").digest();
    return expected.length === received.length && timingSafeEqual(expected, received);
  });
}

// Backstop for buyers who close the popup right after paying.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-shopify-hmac-sha256") ?? "")) {
    return new Response("invalid signature", { status: 401 });
  }

  const order = JSON.parse(raw) as { admin_graphql_api_id?: string; name?: string };

  // TODO: idempotent post-purchase work (Shopify can deliver twice):
  //  - dedupe on x-shopify-event-id with an Upstash SET NX
  //  - send your own confirmation email via Resend
  console.log("orders/paid", order.name, order.admin_graphql_api_id);

  return new Response("ok", { status: 200 });
}
