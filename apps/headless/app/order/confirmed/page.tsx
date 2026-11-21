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

export default async function ConfirmedPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderId } = await searchParams;
  const order = await loadVerifiedOrder(orderId);

  return (
    <main>
      <h1>Thank you, your order is confirmed</h1>
      {order ? (
        <section>
          <p>Order {order.name} · {order.displayFinancialStatus.toLowerCase()}</p>
          <ul>
            {order.lineItems.nodes.map((l, i) => (
              <li key={i}>{l.quantity} × {l.title}</li>
            ))}
          </ul>
          <p>
            Total: {order.totalPriceSet.shopMoney.amount} {order.totalPriceSet.shopMoney.currencyCode}
          </p>
        </section>
      ) : (
        <p>A confirmation email is on its way.</p>
      )}
      <a href="/account/orders">View your orders</a> · <a href="/">Continue shopping</a>
    </main>
  );
}
