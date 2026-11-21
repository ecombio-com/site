import "server-only";
import { cache } from "react";

import { adminGraphql } from "./admin";

export type ShopifyCustomer = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

type RawCustomer = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  defaultEmailAddress: { emailAddress: string } | null;
};

const CUSTOMER_FIELDS = `id firstName lastName defaultEmailAddress { emailAddress }`;

function toCustomer(raw: RawCustomer): ShopifyCustomer {
  return {
    id: raw.id,
    email: raw.defaultEmailAddress?.emailAddress ?? null,
    firstName: raw.firstName,
    lastName: raw.lastName,
  };
}

export async function findCustomerByEmail(email: string): Promise<ShopifyCustomer | null> {
  const data = await adminGraphql<{ customerByIdentifier: RawCustomer | null }>(
    `query FindCustomer($email: String!) {
      customerByIdentifier(identifier: { emailAddress: $email }) { ${CUSTOMER_FIELDS} }
    }`,
    { email },
  );
  return data.customerByIdentifier ? toCustomer(data.customerByIdentifier) : null;
}

async function createCustomer(email: string) {
  const data = await adminGraphql<{
    customerCreate: {
      customer: RawCustomer | null;
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
  const { customer, userErrors } = data.customerCreate;
  return { customer: customer ? toCustomer(customer) : null, userErrors };
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

/** Per-request memoized lookup. `customerId` must come from the session. */
export const getCustomerById = cache(
  async (customerId: string): Promise<ShopifyCustomer | null> => {
    const data = await adminGraphql<{ customer: RawCustomer | null }>(
      `query CustomerById($id: ID!) { customer(id: $id) { ${CUSTOMER_FIELDS} } }`,
      { id: customerId },
    );
    return data.customer ? toCustomer(data.customer) : null;
  },
);
