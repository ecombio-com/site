"use client";

import { useEffect, useRef, useState } from "react";

import { prepareCheckoutAction } from "@/lib/cart/action";

type State =
  | { status: "pending" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string };

export function PaymentsHandoff() {
  const started = useRef(false);
  const [state, setState] = useState<State>({ status: "pending" });

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    prepareCheckoutAction()
      .then(({ checkoutUrl }) => {
        if (!checkoutUrl) {
          setState({ status: "error", message: "Your cart is empty or has expired." });
          return;
        }
        setState({ status: "ready", url: checkoutUrl });
        window.location.replace(checkoutUrl);
      })
      .catch(() => {
        setState({ status: "error", message: "We couldn't start checkout." });
      });
  }, []);

  if (state.status === "error") {
    return (
      <div role="alert" className="flex flex-col items-center gap-3">
        <p>{state.message}</p>
        <a className="underline" href="/cart">
          Back to cart
        </a>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3">
      <p>Processing order . . .</p>
      {state.status === "ready" ? (
        <a className="underline" href={state.url}>
          Continue to checkout
        </a>
      ) : null}
    </div>
  );
}