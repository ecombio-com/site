export type Storefront = {
  id: string;
  name: string;
  /** The brand's myshopify.com domain; matches PUBLIC_STORE_DOMAIN. */
  shopDomain: string;
  domains: {
    site: string;
    account: string;
    checkout: string;
  };
  /** Local dev host served by portless: pnpm dev:hydrogen:<id>. */
  dev: { host: string };
  /** Shopify Hydrogen storefront ID (Oxygen deployments, workflow file name). */
  oxygenStorefrontId: string;
};