"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Status = "idle" | "open" | "error" | "blocked";

export function PaymentsHandoff({ checkoutUrl }: { checkoutUrl: string }) {
  const router = useRouter();
  const ref = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    import("@shopify/checkout-kit/shopify-checkout"); // browser only
    const el = ref.current;
    if (!el) return;

    const onStart = () => setStatus("open");
    const onComplete = (e: Event) => {
      const id = (e as CustomEvent).detail?.checkout?.order?.id as string | undefined;
      router.replace(id ? `/order/confirmed?order=${encodeURIComponent(id)}` : "/order/confirmed");
    };
    const onError = () => setStatus("error");
    const onBlocked = () => setStatus("blocked");
    const onClose = () => setStatus((s) => (s === "open" ? "idle" : s));

    el.addEventListener("start", onStart);
    el.addEventListener("complete", onComplete);
    el.addEventListener("error", onError);
    el.addEventListener("blocked", onBlocked);
    el.addEventListener("close", onClose);
    return () => {
      el.removeEventListener("start", onStart);
      el.removeEventListener("complete", onComplete);
      el.removeEventListener("error", onError);
      el.removeEventListener("blocked", onBlocked);
      el.removeEventListener("close", onClose);
    };
  }, [router]);

  function pay(e: React.MouseEvent) {
    e.preventDefault();
    const el = ref.current as (HTMLElement & { src: string; open: () => void }) | null;
    if (!el) return;
    el.src = checkoutUrl;
    el.open(); // must run inside the click handler or the popup is blocked
  }

  return (
    <section>
      {/* confirm the popup attribute name in Shopify's Checkout Kit docs */}
      <shopify-checkout ref={ref} target="popup" />
      <a href={checkoutUrl} target="_blank" rel="noreferrer" onClick={pay}>
        {status === "open" ? "Checkout is open in another window" : "Pay securely"}
      </a>
      {status === "blocked" && <p role="alert">Your browser blocked the checkout window. Allow popups and try again.</p>}
      {status === "error" && <p role="alert">Checkout hit an error. Please try again.</p>}
      <p><a href="/checkout/shipping">Back to shipping</a></p>
    </section>
  );
}
