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
};