import type { DetailedHTMLProps, HTMLAttributes, RefAttributes } from "react";

type ShopifyCheckoutProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> &
  RefAttributes<HTMLElement> & {
    src?: string;
    target?: "auto" | "popup" | "_blank";
  };

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "shopify-checkout": ShopifyCheckoutProps;
    }
  }
}

export {};
