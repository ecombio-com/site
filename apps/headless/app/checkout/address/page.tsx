import { Suspense } from "react";
import { redirect } from "next/navigation";
import { saveAddress } from "../actions";
import { Container } from "@/components/ui/container";
import { getCartId, getSessionEmail } from "@/lib/checkout/adapters";

const field = "flex flex-col gap-1.5 text-sm font-medium";
const input =
  "h-11 w-full rounded-md border border-neutral-300 bg-background px-3 text-base font-normal outline-none focus:border-foreground focus:ring-1 focus:ring-foreground";

async function AddressPageContent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!(await getCartId())) redirect("/cart");
  const signedIn = Boolean(await getSessionEmail());

  return (
    <Container className="mx-auto w-full max-w-xl py-10">
      <h1 className="mb-6 text-2xl font-semibold">Shipping address</h1>
      {error && (
        <p role="alert" className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <form action={saveAddress} className="grid grid-cols-2 gap-4">
        {!signedIn && (
          <label className={`${field} col-span-2`}>
            Email
            <input className={input} name="email" type="email" required autoComplete="email" />
          </label>
        )}
        <label className={field}>
          First name
          <input className={input} name="firstName" required autoComplete="given-name" />
        </label>
        <label className={field}>
          Last name
          <input className={input} name="lastName" required autoComplete="family-name" />
        </label>
        <label className={`${field} col-span-2`}>
          Address
          <input className={input} name="address1" required autoComplete="address-line1" />
        </label>
        <label className={`${field} col-span-2`}>
          Apartment, suite (optional)
          <input className={input} name="address2" autoComplete="address-line2" />
        </label>
        <label className={`${field} col-span-2`}>
          City
          <input className={input} name="city" required autoComplete="address-level2" />
        </label>
        <label className={field}>
          State (e.g. CA)
          <input className={input} name="provinceCode" required maxLength={3} autoComplete="address-level1" />
        </label>
        <label className={field}>
          ZIP
          <input className={input} name="zip" required autoComplete="postal-code" />
        </label>
        <label className={field}>
          Country (e.g. US)
          <input className={input} name="countryCode" required defaultValue="US" maxLength={2} autoComplete="country" />
        </label>
        <label className={field}>
          Phone (optional)
          <input className={input} name="phone" type="tel" autoComplete="tel" />
        </label>
        <button
          type="submit"
          className="col-span-2 mt-2 h-12 rounded-md bg-foreground px-6 text-sm font-medium text-background hover:opacity-90"
        >
          Continue to shipping
        </button>
      </form>
    </Container>
  );
}

export default function AddressPage(props: any) {
  return (
    <Suspense fallback={null}>
      <AddressPageContent {...props} />
    </Suspense>
  );
}
