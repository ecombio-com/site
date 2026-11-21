import { requireSession } from "@/lib/auth/session";
import { logout } from "@/lib/auth/actions";
import { getCustomerWithOrders } from "@/lib/shopify/customers";

export const metadata = { title: "Account" };

function money(amount: string, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}

export default async function AccountPage() {
  const session = await requireSession("/account");
  const customer = await getCustomerWithOrders(session.customerId);

  const signOut = (
    <form action={logout}>
      <button type="submit" className="text-sm underline">Sign out</button>
    </form>
  );

  if (!customer) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="mb-4">We couldn&apos;t find your account. Please sign out and sign in again.</p>
        {signOut}
      </main>
    );
  }

  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ");

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{name || "Your account"}</h1>
          <p className="text-sm text-neutral-600">{session.email}</p>
        </div>
        {signOut}
      </header>

      <h2 className="mb-3 text-lg font-medium">Orders</h2>
      {customer.orders.length === 0 ? (
        <p className="text-sm text-neutral-600">No orders yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded border border-neutral-200">
          {customer.orders.map((order) => (
            <li key={order.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">{order.name}</p>
                <p className="text-sm text-neutral-600">
                  {new Date(order.processedAt).toLocaleDateString("en-US")} ·{" "}
                  {order.displayFulfillmentStatus.replaceAll("_", " ").toLowerCase()}
                </p>
              </div>
              <div className="text-right">
                <p>{money(order.totalPriceSet.shopMoney.amount, order.totalPriceSet.shopMoney.currencyCode)}</p>
                <a href={order.statusPageUrl} className="text-sm underline">View status</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
