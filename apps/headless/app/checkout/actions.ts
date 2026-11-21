"use server";

import { redirect } from "next/navigation";
import { getCartId, getSessionEmail } from "@/lib/checkout/adapters";
import { selectDeliveryOption, setBuyerEmail, setDeliveryAddress } from "@/lib/checkout/storefront";

const REQUIRED = ["firstName", "lastName", "address1", "city", "provinceCode", "zip", "countryCode"] as const;

export async function saveAddress(formData: FormData) {
  const cartId = await getCartId();
  if (!cartId) redirect("/cart");

  const get = (k: string) => String(formData.get(k) ?? "").trim();
  for (const k of REQUIRED) {
    if (!get(k)) redirect(`/checkout/address?error=${encodeURIComponent(`Missing ${k}`)}`);
  }

  try {
    // Signed-in customers: tie the cart to the session email so checkout doesn't ask again.
    const email = (await getSessionEmail()) ?? get("email");
    if (email) await setBuyerEmail(cartId, email);

    await setDeliveryAddress(cartId, {
      firstName: get("firstName"),
      lastName: get("lastName"),
      address1: get("address1"),
      address2: get("address2") || undefined,
      city: get("city"),
      provinceCode: get("provinceCode").toUpperCase(),
      zip: get("zip"),
      countryCode: get("countryCode").toUpperCase(),
      phone: get("phone") || undefined,
    });
  } catch (e) {
    redirect(`/checkout/address?error=${encodeURIComponent((e as Error).message)}`);
  }
  redirect("/checkout/shipping");
}

export async function saveShipping(formData: FormData) {
  const cartId = await getCartId();
  if (!cartId) redirect("/cart");

  const groupId = String(formData.get("groupId") ?? "");
  const handle = String(formData.get("handle") ?? "");
  if (!groupId || !handle) redirect("/checkout/shipping?error=Pick%20a%20shipping%20option");

  try {
    await selectDeliveryOption(cartId, groupId, handle);
  } catch (e) {
    redirect(`/checkout/shipping?error=${encodeURIComponent((e as Error).message)}`);
  }
  redirect("/payments");
}
