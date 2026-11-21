import { Suspense } from "react";
import { redirect } from "next/navigation";
import { saveShipping } from "../actions";
import { Container } from "@/components/ui/container";
import { getCartId } from "@/lib/checkout/adapters";
import { getCart } from "@/lib/checkout/storefront";

function price(amount: string, currency: string) {
  const n = Number(amount);
  if (n === 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

async function ShippingPageContent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const cartId = await getCartId();
  if (!cartId) redirect("/cart");

  const cart = await getCart(cartId);
  if (!cart || cart.totalQuantity === 0) redirect("/cart");

  const group = cart.deliveryGroups[0];
  if (!group || group.deliveryOptions.length === 0) redirect("/checkout/address?error=No%20shipping%20options%20for%20that%20address");

  return (
    <Container className="mx-auto w-full max-w-xl py-10">
      <h1 className="mb-6 text-2xl font-semibold">Shipping method</h1>
      {error && (
        <p role="alert" className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <form action={saveShipping} className="flex flex-col gap-3">
        <input type="hidden" name="groupId" value={group.id} />
        {group.deliveryOptions.map((o) => (
          <label
            key={o.handle}
            className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-neutral-300 px-4 py-4 text-sm has-[:checked]:border-foreground has-[:checked]:ring-1 has-[:checked]:ring-foreground"
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="handle"
                value={o.handle}
                defaultChecked={group.selectedDeliveryOption?.handle === o.handle}
                required
              />
              <span className="font-medium">{o.title}</span>
            </span>
            <span>{price(o.estimatedCost.amount, o.estimatedCost.currencyCode)}</span>
          </label>
        ))}
        <button
          type="submit"
          className="mt-2 h-12 rounded-md bg-foreground px-6 text-sm font-medium text-background hover:opacity-90"
        >
          Continue to payment
        </button>
      </form>
      <a href="/checkout/address" className="mt-4 inline-block text-sm underline">
        Change address
      </a>
    </Container>
  );
}

export default function ShippingPage(props: any) {
  return (
    <Suspense fallback={null}>
      <ShippingPageContent {...props} />
    </Suspense>
  );
}
