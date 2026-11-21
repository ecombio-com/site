const DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN!;
const TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
const VERSION = process.env.SHOPIFY_API_VERSION ?? "2026-10";

async function sf<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://${DOMAIN}/api/${VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": TOKEN },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

function assertNoUserErrors(errs?: { message: string }[]) {
  if (errs?.length) throw new Error(errs.map((e) => e.message).join("; "));
}

export type Money = { amount: string; currencyCode: string };
export type DeliveryOption = {
  handle: string;
  title: string;
  estimatedCost: Money;
};
export type DeliveryAddress = {
  firstName: string | null;
  lastName: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  provinceCode: string | null;
  zip: string | null;
};
export type DeliveryGroup = {
  id: string;
  deliveryAddress: DeliveryAddress | null;
  deliveryOptions: DeliveryOption[];
  selectedDeliveryOption: DeliveryOption | null;
};
export type CartLine = {
  id: string;
  quantity: number;
  cost: { totalAmount: Money };
  merchandise: {
    title: string;
    product: { title: string };
    image: { url: string; altText: string | null } | null;
  };
};
export type CartSummary = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  buyerEmail: string | null;
  cost: { subtotalAmount: Money; totalAmount: Money; totalTaxAmount: Money | null };
  lines: CartLine[];
  deliveryGroups: DeliveryGroup[];
};

const CART_FIELDS = `
  id checkoutUrl totalQuantity
  buyerIdentity { email }
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
    totalTaxAmount { amount currencyCode }
  }
  lines(first: 50) {
    nodes {
      id quantity
      cost { totalAmount { amount currencyCode } }
      merchandise {
        ... on ProductVariant {
          title
          product { title }
          image { url altText }
        }
      }
    }
  }
  deliveryGroups(first: 5) {
    nodes {
      id
      deliveryAddress { firstName lastName address1 address2 city provinceCode zip }
      selectedDeliveryOption { handle title estimatedCost { amount currencyCode } }
      deliveryOptions { handle title estimatedCost { amount currencyCode } }
    }
  }
`;

type RawCart = Omit<CartSummary, "deliveryGroups" | "lines" | "buyerEmail"> & {
  deliveryGroups: { nodes: DeliveryGroup[] };
  lines: { nodes: CartLine[] };
  buyerIdentity: { email: string | null } | null;
};
const flatten = (c: RawCart): CartSummary => {
  const { buyerIdentity, ...rest } = c;
  return {
    ...rest,
    buyerEmail: buyerIdentity?.email ?? null,
    lines: c.lines.nodes,
    deliveryGroups: c.deliveryGroups.nodes,
  };
};
export async function getCart(cartId: string): Promise<CartSummary | null> {
  const d = await sf<{ cart: RawCart | null }>(`query($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`, { id: cartId });
  return d.cart ? flatten(d.cart) : null;
}

export async function setBuyerEmail(cartId: string, email: string) {
  const d = await sf<{ cartBuyerIdentityUpdate: { userErrors: { message: string }[] } }>(
    `mutation($id: ID!, $b: CartBuyerIdentityInput!) {
       cartBuyerIdentityUpdate(cartId: $id, buyerIdentity: $b) { userErrors { message } }
     }`,
    { id: cartId, b: { email } },
  );
  assertNoUserErrors(d.cartBuyerIdentityUpdate.userErrors);
}

export type AddressInput = {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  provinceCode: string;
  zip: string;
  countryCode: string;
  phone?: string;
};

export async function setDeliveryAddress(cartId: string, address: AddressInput) {
  const d = await sf<{ cartDeliveryAddressesAdd: { userErrors: { message: string }[] } }>(
    `mutation($id: ID!, $a: [CartSelectableAddressInput!]!) {
       cartDeliveryAddressesAdd(cartId: $id, addresses: $a) { userErrors { message } }
     }`,
    { id: cartId, a: [{ address: { deliveryAddress: address }, selected: true }] },
  );
  assertNoUserErrors(d.cartDeliveryAddressesAdd.userErrors);
}

export async function selectDeliveryOption(cartId: string, deliveryGroupId: string, deliveryOptionHandle: string) {
  const d = await sf<{ cartSelectedDeliveryOptionsUpdate: { userErrors: { message: string }[] } }>(
    `mutation($id: ID!, $s: [CartSelectedDeliveryOptionInput!]!) {
       cartSelectedDeliveryOptionsUpdate(cartId: $id, selectedDeliveryOptions: $s) { userErrors { message } }
     }`,
    { id: cartId, s: [{ deliveryGroupId, deliveryOptionHandle }] },
  );
  assertNoUserErrors(d.cartSelectedDeliveryOptionsUpdate.userErrors);
}
