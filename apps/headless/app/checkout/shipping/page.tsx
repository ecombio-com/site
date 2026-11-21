import { redirect } from "next/navigation";
import { saveShipping } from "../actions";
import { getCartId } from "@/lib/checkout/adapters";
import { getCart } from "@/lib/checkout/storefront";

export default async function ShippingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const cartId = await getCartId();
  if (!cartId) redirect("/cart");

  const cart = await getCart(cartId);
  if (!cart || cart.totalQuantity === 0) redirect("/cart");

  const group = cart.deliveryGroups[0];
  if (!group || group.deliveryOptions.length === 0) redirect("/checkout/address?error=No%20shipping%20options%20for%20that%20address");

  return (
    <main>
      <h1>Shipping method</h1>
      {error && <p role="alert">{error}</p>}
      <form action={saveShipping}>
        <input type="hidden" name="groupId" value={group.id} />
        {group.deliveryOptions.map((o) => (
          <label key={o.handle}>
            <input
              type="radio"
              name="handle"
              value={o.handle}
              defaultChecked={group.selectedDeliveryOption?.handle === o.handle}
              required
            />
            {o.title} — {Number(o.estimatedCost.amount) === 0 ? "Free" : `${o.estimatedCost.amount} ${o.estimatedCost.currencyCode}`}
          </label>
        ))}
        <button type="submit">Continue to payment</button>
      </form>
      <a href="/checkout/address">Change address</a>
    </main>
  );
}
