// Checkout may only ever open on hosts you control.
// Set CHECKOUT_ALLOWED_HOSTS="checkout.ecombio.com" (comma-separated) in .env.local and Vercel.
const allowed = (process.env.CHECKOUT_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedCheckoutUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && allowed.includes(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}
