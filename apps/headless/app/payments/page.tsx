import { redirect } from "next/navigation";
import { PaymentsHandoff } from "@/components/payments/payments-handoff";
import { getCartId } from "@/lib/checkout/adapters";
import { getCart } from "@/lib/checkout/storefront";
import { isAllowedCheckoutUrl } from "@/lib/checkout/allowed-host";

export default async function PaymentsPage() {
  const cartId = await getCartId();
  if (!cartId) redirect("/cart");

  const cart = await getCart(cartId);
  if (!cart || cart.totalQuantity === 0) redirect("/cart");

  // Guard: don't open payment until address and shipping are set.
  const group = cart.deliveryGroups[0];
  if (!group) redirect("/checkout/address");
  if (!group.selectedDeliveryOption) redirect("/checkout/shipping");

  // Never hand the buyer a checkout URL on a host we don't control (e.g. *.myshopify.com).
  if (!isAllowedCheckoutUrl(cart.checkoutUrl)) {
    console.error("Blocked checkout URL host:", new URL(cart.checkoutUrl).hostname);
    return (
      <main>
        <h1>Checkout is temporarily unavailable</h1>
        <p>Please try again shortly or contact support.</p>
        <a href="/cart">Back to cart</a>
      </main>
    );
  }

  return (
    <main>
      <h1>Secure payment</h1>
      <p>You'll complete payment in a secure checkout window. Your card details never touch our servers.</p>
      <PaymentsHandoff checkoutUrl={cart.checkoutUrl} />
    </main>
  );
}
