import { redirect } from "next/navigation";
import { saveAddress } from "../actions";
import { getCartId, getSessionEmail } from "@/lib/checkout/adapters";

export default async function AddressPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!(await getCartId())) redirect("/cart");
  const signedIn = Boolean(await getSessionEmail());

  return (
    <main>
      <h1>Shipping address</h1>
      {error && <p role="alert">{error}</p>}
      <form action={saveAddress}>
        {!signedIn && (
          <label>Email <input name="email" type="email" required autoComplete="email" /></label>
        )}
        <label>First name <input name="firstName" required autoComplete="given-name" /></label>
        <label>Last name <input name="lastName" required autoComplete="family-name" /></label>
        <label>Address <input name="address1" required autoComplete="address-line1" /></label>
        <label>Apartment, suite <input name="address2" autoComplete="address-line2" /></label>
        <label>City <input name="city" required autoComplete="address-level2" /></label>
        <label>State (e.g. CA) <input name="provinceCode" required maxLength={3} autoComplete="address-level1" /></label>
        <label>ZIP <input name="zip" required autoComplete="postal-code" /></label>
        <label>Country (e.g. US) <input name="countryCode" required defaultValue="US" maxLength={2} autoComplete="country" /></label>
        <label>Phone <input name="phone" type="tel" autoComplete="tel" /></label>
        <button type="submit">Continue to shipping</button>
      </form>
    </main>
  );
}
