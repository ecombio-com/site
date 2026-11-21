import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { adminGraphql, getSessionEmail } from "@/lib/checkout/adapters";

type OrderResult = {
  order: {
    id: string;
    name: string;
    email: string | null;
    displayFinancialStatus: string;
    totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
    lineItems: { nodes: { title: string; quantity: number }[] };
  } | null;
};

const ORDER_QUERY = `
  query($id: ID!) {
    order(id: $id) {
      id name email displayFinancialStatus
      totalPriceSet { shopMoney { amount currencyCode } }
      lineItems(first: 20) { nodes { title quantity } }
    }
  }`;

async function loadVerifiedOrder(orderId: string | undefined) {
  if (!orderId?.startsWith("gid://shopify/Order/")) return null;
  const sessionEmail = await getSessionEmail();
  if (!sessionEmail) return null; // guests get the generic thank-you only

  try {
    const { order } = await adminGraphql<OrderResult>(ORDER_QUERY, { id: orderId });
    // Never show an order that doesn't belong to the signed-in customer.
    if (!order || order.email?.toLowerCase() !== sessionEmail.toLowerCase()) return null;
    return order;
  } catch {
    return null;
  }
}

async function ConfirmedPageContent({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderId } = await searchParams;
  const order = await loadVerifiedOrder(orderId);

  return (
    <Container className="mx-auto w-full max-w-xl py-10">
      <h1 className="mb-4 text-2xl font-semibold">Thank you, your order is confirmed</h1>
      {order ? (
        <section className="mb-6 rounded-md border border-neutral-300 p-4 text-sm">
          <p className="mb-3 font-medium">Order {order.name} · {order.displayFinancialStatus.toLowerCase()}</p>
          <ul className="mb-3 list-disc pl-5">
            {order.lineItems.nodes.map((l, i) => (
              <li key={i}>{l.quantity} × {l.title}</li>
            ))}
          </ul>
          <p className="font-medium">
            Total: {new Intl.NumberFormat("en-US", { style: "currency", currency: order.totalPriceSet.shopMoney.currencyCode }).format(Number(order.totalPriceSet.shopMoney.amount))}
          </p>
        </section>
      ) : (
        <p className="mb-6 text-sm text-neutral-600">A confirmation email is on its way.</p>
      )}
      <div className="flex gap-4 text-sm">
        <a href="/account/orders" className="underline">View your orders</a>
        <a href="/" className="underline">Continue shopping</a>
      </div>
    </Container>
  );
}

export default function ConfirmedPage(props: any) {
  return (
    <Suspense fallback={null}>
      <ConfirmedPageContent {...props} />
    </Suspense>
  );
}
