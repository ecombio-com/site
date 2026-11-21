import { Suspense } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { getCartId, getSessionEmail } from "@/lib/checkout/adapters";
import { getCart, type Money } from "@/lib/checkout/storefront";

const card = "rounded-md border border-neutral-300 p-4 text-sm";

function money(m: Money) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: m.currencyCode }).format(Number(m.amount));
}

async function PaymentsPageContent() {
  const cartId = await getCartId();
  if (!cartId) redirect("/cart");

  const cart = await getCart(cartId);
  if (!cart || cart.totalQuantity === 0) redirect("/cart");

  // Guard: don't open payment until address and shipping are set.
  const group = cart.deliveryGroups[0];
  if (!group) redirect("/checkout/address");
  if (!group.selectedDeliveryOption) redirect("/checkout/shipping");

  const email = cart.buyerEmail ?? (await getSessionEmail());
  const a = group.deliveryAddress;
  const ship = group.selectedDeliveryOption;
  const tax = cart.cost.totalTaxAmount;

  return (
    <Container className="mx-auto w-full max-w-xl py-10">
      <h1 className="mb-6 text-2xl font-semibold">Review and pay</h1>

      <section className={`${card} mb-4`}>
        <h2 className="mb-3 font-medium">Your order</h2>
        <ul className="flex flex-col gap-3">
          {cart.lines.map((l) => (
            <li key={l.id} className="flex items-center gap-3">
              {l.merchandise.image ? (
                <Image
                  src={l.merchandise.image.url}
                  alt={l.merchandise.image.altText ?? l.merchandise.product.title}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-md border border-neutral-200 object-cover"
                />
              ) : (
                <div className="h-14 w-14 rounded-md bg-neutral-100" />
              )}
              <div className="flex-1">
                <p className="font-medium">{l.merchandise.product.title}</p>
                {l.merchandise.title !== "Default Title" && (
                  <p className="text-neutral-600">{l.merchandise.title}</p>
                )}
                <p className="text-neutral-600">Qty {l.quantity}</p>
              </div>
              <p className="font-medium">{money(l.cost.totalAmount)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${card} mb-4 flex flex-col gap-4`}>
        {email && (
          <div className="flex justify-between gap-4">
            <div>
              <p className="text-neutral-600">Contact</p>
              <p>{email}</p>
            </div>
          </div>
        )}
        {a && (
          <div className="flex justify-between gap-4">
            <div>
              <p className="text-neutral-600">Ship to</p>
              <p>{[a.firstName, a.lastName].filter(Boolean).join(" ")}</p>
              <p>{[a.address1, a.address2].filter(Boolean).join(", ")}</p>
              <p>{[a.city, a.provinceCode, a.zip].filter(Boolean).join(" ")}</p>
            </div>
            <a href="/checkout/address" className="text-sm underline">Change</a>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-neutral-600">Shipping method</p>
            <p>
              {ship.title} · {Number(ship.estimatedCost.amount) === 0 ? "Free" : money(ship.estimatedCost)}
            </p>
          </div>
          <a href="/checkout/shipping" className="text-sm underline">Change</a>
        </div>
      </section>

      <section className={`${card} mb-6 flex flex-col gap-2`}>
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{money(cart.cost.subtotalAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Shipping</span>
          <span>{Number(ship.estimatedCost.amount) === 0 ? "Free" : money(ship.estimatedCost)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{tax && Number(tax.amount) > 0 ? money(tax) : "Calculated at payment"}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-neutral-200 pt-3 text-base font-semibold">
          <span>Total</span>
          <span>{money(cart.cost.totalAmount)}</span>
        </div>
      </section>

      <button type="button" disabled className="h-12 w-full cursor-not-allowed rounded-md bg-neutral-200 px-6 text-sm font-medium text-neutral-500">Payment is not available yet</button>
    </Container>
  );
}

export default function PaymentsPage(props: any) {
  return (
    <Suspense fallback={null}>
      <PaymentsPageContent {...props} />
    </Suspense>
  );
}
