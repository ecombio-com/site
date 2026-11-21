import "server-only";
import { cache } from "react";
import { adminGraphql } from "./admin";

export type ShopifyCustomer = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type OrderSummary = {
  id: string;
  name: string;
  processedAt: string;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string;
  statusPageUrl: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
};

const CUSTOMER_FIELDS = `id email firstName lastName`;

export async function findCustomerByEmail(email: string): Promise<ShopifyCustomer | null> {
  const data = await adminGraphql<{ customerByIdentifier: ShopifyCustomer | null }>(
    `query FindCustomer($email: String!) {
      customerByIdentifier(identifier: { emailAddress: $email }) { ${CUSTOMER_FIELDS} }
    }`,
    { email },
  );
  return data.customerByIdentifier;
}

async function createCustomer(email: string) {
  const data = await adminGraphql<{
    customerCreate: {
      customer: ShopifyCustomer | null;
      userErrors: { field: string[] | null; message: string }[];
    };
  }>(
    `mutation CreateCustomer($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer { ${CUSTOMER_FIELDS} }
        userErrors { field message }
      }
    }`,
    { input: { email } },
  );
  return data.customerCreate;
}

/** Call only AFTER the email has been verified. */
export async function findOrCreateCustomer(email: string): Promise<ShopifyCustomer> {
  const existing = await findCustomerByEmail(email);
  if (existing) return existing;

  const { customer, userErrors } = await createCustomer(email);
  if (customer) return customer;

  // Another request may have created it between our lookup and create.
  const retry = await findCustomerByEmail(email);
  if (retry) return retry;

  throw new Error(`Could not create Shopify customer: ${userErrors.map((e) => e.message).join("; ")}`);
}

/** `customerId` MUST come from the verified session, never from request input. */
export async function getCustomerWithOrders(
  customerId: string,
  first = 20,
): Promise<(ShopifyCustomer & { orders: OrderSummary[] }) | null> {
  const data = await adminGraphql<{
    customer: (ShopifyCustomer & { orders: { nodes: OrderSummary[] } }) | null;
  }>(
    `query CustomerOrders($id: ID!, $first: Int!) {
      customer(id: $id) {
        ${CUSTOMER_FIELDS}
        orders(first: $first, sortKey: PROCESSED_AT, reverse: true) {
          nodes {
            id
            name
            processedAt
            displayFinancialStatus
            displayFulfillmentStatus
            statusPageUrl
            totalPriceSet { shopMoney { amount currencyCode } }
          }
        }
      }
    }`,
    { id: customerId, first },
  );
  if (!data.customer) return null;
  return { ...data.customer, orders: data.customer.orders.nodes };
}

/** Per-request memoized lookup. `customerId` must come from the session. */
export const getCustomerById = cache(
  async (customerId: string): Promise<ShopifyCustomer | null> => {
    const data = await adminGraphql<{ customer: ShopifyCustomer | null }>(
      `query CustomerById($id: ID!) { customer(id: $id) { ${CUSTOMER_FIELDS} } }`,
      { id: customerId },
    );
    return data.customer;
  },
);
