import { cache } from "react";

import { requireSession } from "@/lib/auth/session";
import type {
  CustomerAddress,
  CustomerAddressInput,
  CustomerOrder,
  CustomerOrderSummary,
  CustomerOrdersPage,
  CustomerProfile,
  OrderLineItem,
} from "@/lib/customer/types";
import type { Money } from "@/lib/money/types";
import { adminGraphql } from "@/lib/shopify/admin";
import { getCustomerById } from "@/lib/shopify/customers";
import type { CustomerUserError } from "@/lib/shopify/operations/customer/types";
import { transformImage } from "@/lib/shopify/transforms/product";

const ORDERS_PER_PAGE = 10;
const ORDER_GID = /^gid:\/\/shopify\/Order\/\d+$/;

type MoneyBag = { presentmentMoney: { amount: string; currencyCode: string } };
type AdminUserError = { field?: string[] | null; message: string };

const MONEY = `{ presentmentMoney { amount currencyCode } }`;
const ORDER_SUMMARY_FIELDS = `id name number processedAt displayFinancialStatus displayFulfillmentStatus totalPriceSet ${MONEY}`;
const ADDRESS_FIELDS = `id address1 address2 city company countryCodeV2 firstName lastName phone provinceCode zip formatted`;

type RawOrderSummary = {
  id: string;
  name: string;
  number: number;
  processedAt: string;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string;
  totalPriceSet: MoneyBag;
};

type RawAddress = {
  id?: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  company: string | null;
  countryCodeV2: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  provinceCode: string | null;
  zip: string | null;
  formatted: string[];
};

type RawOrder = RawOrderSummary & {
  customer: { id: string } | null;
  statusPageUrl: string;
  lineItems: {
    nodes: Array<{
      image: { altText: string | null; height: number | null; url: string; width: number | null } | null;
      quantity: number;
      title: string;
      variantTitle: string | null;
      discountedTotalSet: MoneyBag | null;
    }>;
  };
  shippingAddress: RawAddress | null;
  subtotalPriceSet: MoneyBag | null;
  totalShippingPriceSet: MoneyBag | null;
  totalTaxSet: MoneyBag | null;
};

function money(bag: MoneyBag | null | undefined): Money | null {
  if (!bag) return null;
  return {
    amount: bag.presentmentMoney.amount,
    currencyCode: bag.presentmentMoney.currencyCode as Money["currencyCode"],
  };
}

function toUserErrors(errors: AdminUserError[]): CustomerUserError[] {
  return errors.map((error) => ({ field: error.field, message: error.message }));
}

function toOrderSummary(order: RawOrderSummary): CustomerOrderSummary {
  return {
    financialStatus: order.displayFinancialStatus ?? null,
    fulfillmentStatus: order.displayFulfillmentStatus,
    id: order.id,
    name: order.name,
    number: order.number,
    processedAt: order.processedAt,
    totalPrice: money(order.totalPriceSet) as Money,
  };
}

function toAddress(address: RawAddress, defaultId: string | null = null): CustomerAddress {
  return {
    address1: address.address1 ?? null,
    address2: address.address2 ?? null,
    city: address.city ?? null,
    company: address.company ?? null,
    countryCode: address.countryCodeV2 ?? null,
    firstName: address.firstName ?? null,
    formatted: address.formatted,
    id: address.id ?? "",
    isDefault: defaultId != null && address.id === defaultId,
    lastName: address.lastName ?? null,
    phoneNumber: address.phone ?? null,
    zip: address.zip ?? null,
    zoneCode: address.provinceCode ?? null,
  };
}

function toOrder(order: RawOrder): CustomerOrder {
  return {
    ...toOrderSummary(order),
    lineItems: order.lineItems.nodes.map(
      (item): OrderLineItem => ({
        image: transformImage(item.image),
        quantity: item.quantity,
        title: item.title,
        totalPrice: money(item.discountedTotalSet),
        variantTitle: item.variantTitle ?? null,
      }),
    ),
    shippingAddress: order.shippingAddress ? toAddress(order.shippingAddress) : null,
    statusPageUrl: order.statusPageUrl,
    subtotal: money(order.subtotalPriceSet),
    totalShipping: money(order.totalShippingPriceSet),
    totalTax: money(order.totalTaxSet),
  };
}

// The form uses Customer Account API field names; Admin's MailingAddressInput differs.
function toMailingAddressInput(a: CustomerAddressInput) {
  return {
    address1: a.address1,
    address2: a.address2,
    city: a.city,
    company: a.company,
    countryCode: a.countryCode,
    firstName: a.firstName,
    lastName: a.lastName,
    phone: a.phoneNumber,
    provinceCode: a.zoneCode,
    zip: a.zip,
  };
}

export const getCustomerProfile = cache(async (): Promise<CustomerProfile | null> => {
  const session = await requireSession("/account/profile");
  const customer = await getCustomerById(session.customerId);
  if (!customer) return null;
  return {
    email: customer.email ?? session.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
  };
});

export async function fetchCustomerOrders(cursor?: {
  after?: string;
  before?: string;
}): Promise<CustomerOrdersPage> {
  const paginateBackward = Boolean(cursor?.before);
  const orderParams = new URLSearchParams();
  if (cursor?.after) orderParams.set("after", cursor.after);
  if (cursor?.before) orderParams.set("before", cursor.before);
  const session = await requireSession(
    `/account/orders${orderParams.size > 0 ? `?${orderParams}` : ""}`,
  );

  const data = await adminGraphql<{
    customer: {
      orders: {
        nodes: RawOrderSummary[];
        pageInfo: {
          endCursor: string | null;
          hasNextPage: boolean;
          hasPreviousPage: boolean;
          startCursor: string | null;
        };
      };
    } | null;
  }>(
    `query CustomerOrders($id: ID!, $after: String, $before: String, $first: Int, $last: Int) {
      customer(id: $id) {
        orders(after: $after, before: $before, first: $first, last: $last, reverse: true, sortKey: PROCESSED_AT) {
          nodes { ${ORDER_SUMMARY_FIELDS} }
          pageInfo { endCursor hasNextPage hasPreviousPage startCursor }
        }
      }
    }`,
    {
      id: session.customerId,
      after: cursor?.after,
      before: cursor?.before,
      first: paginateBackward ? undefined : ORDERS_PER_PAGE,
      last: paginateBackward ? ORDERS_PER_PAGE : undefined,
    },
  );

  const orders = data.customer?.orders;
  if (!orders) {
    return {
      orders: [],
      pageInfo: { endCursor: null, hasNextPage: false, hasPreviousPage: false, startCursor: null },
    };
  }
  return {
    orders: orders.nodes.map(toOrderSummary),
    pageInfo: {
      endCursor: orders.pageInfo.endCursor ?? null,
      hasNextPage: orders.pageInfo.hasNextPage,
      hasPreviousPage: orders.pageInfo.hasPreviousPage,
      startCursor: orders.pageInfo.startCursor ?? null,
    },
  };
}

export async function fetchCustomerOrder(id: string): Promise<CustomerOrder | null> {
  const session = await requireSession(`/account/orders/${encodeURIComponent(id)}`);
  if (!ORDER_GID.test(id)) return null;

  const data = await adminGraphql<{ order: RawOrder | null }>(
    `query CustomerOrder($id: ID!) {
      order(id: $id) {
        ${ORDER_SUMMARY_FIELDS}
        customer { id }
        statusPageUrl
        lineItems(first: 50) {
          nodes {
            image { altText height url width }
            quantity
            title
            variantTitle
            discountedTotalSet ${MONEY}
          }
        }
        shippingAddress { ${ADDRESS_FIELDS} }
        subtotalPriceSet ${MONEY}
        totalShippingPriceSet ${MONEY}
        totalTaxSet ${MONEY}
      }
    }`,
    { id },
  );

  // The Admin API does not scope order lookups to a customer, so check ownership here.
  if (!data.order || data.order.customer?.id !== session.customerId) return null;
  return toOrder(data.order);
}

async function getAddressIds(customerId: string): Promise<string[]> {
  const data = await adminGraphql<{
    customer: { addressesV2: { nodes: { id: string }[] } } | null;
  }>(
    `query CustomerAddressIds($id: ID!) {
      customer(id: $id) { addressesV2(first: 100) { nodes { id } } }
    }`,
    { id: customerId },
  );
  return data.customer?.addressesV2.nodes.map((node) => node.id) ?? [];
}

const NOT_FOUND: CustomerUserError[] = [{ message: "Address not found." }];

export async function fetchCustomerAddresses(): Promise<CustomerAddress[]> {
  const session = await requireSession("/account/addresses");
  const data = await adminGraphql<{
    customer: {
      defaultAddress: { id: string } | null;
      addressesV2: { nodes: RawAddress[] };
    } | null;
  }>(
    `query CustomerAddresses($id: ID!) {
      customer(id: $id) {
        defaultAddress { id }
        addressesV2(first: 30) { nodes { ${ADDRESS_FIELDS} } }
      }
    }`,
    { id: session.customerId },
  );
  if (!data.customer) return [];

  const defaultId = data.customer.defaultAddress?.id ?? null;
  return data.customer.addressesV2.nodes
    .map((address) => toAddress(address, defaultId))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

export async function createCustomerAddress(
  address: CustomerAddressInput,
  defaultAddress: boolean,
): Promise<CustomerUserError[]> {
  const session = await requireSession("/account/addresses");
  const data = await adminGraphql<{
    customerAddressCreate: { userErrors: AdminUserError[] } | null;
  }>(
    `mutation CreateAddress($customerId: ID!, $address: MailingAddressInput!, $setAsDefault: Boolean) {
      customerAddressCreate(customerId: $customerId, address: $address, setAsDefault: $setAsDefault) {
        address { id }
        userErrors { field message }
      }
    }`,
    {
      customerId: session.customerId,
      address: toMailingAddressInput(address),
      setAsDefault: defaultAddress,
    },
  );
  return toUserErrors(data.customerAddressCreate?.userErrors ?? []);
}

export async function updateCustomerAddress(
  addressId: string,
  address: CustomerAddressInput,
  defaultAddress: boolean,
): Promise<CustomerUserError[]> {
  const session = await requireSession("/account/addresses");
  if (!(await getAddressIds(session.customerId)).includes(addressId)) return NOT_FOUND;

  const data = await adminGraphql<{
    customerAddressUpdate: { userErrors: AdminUserError[] } | null;
  }>(
    `mutation UpdateAddress($customerId: ID!, $addressId: ID!, $address: MailingAddressInput!, $setAsDefault: Boolean) {
      customerAddressUpdate(customerId: $customerId, addressId: $addressId, address: $address, setAsDefault: $setAsDefault) {
        address { id }
        userErrors { field message }
      }
    }`,
    {
      customerId: session.customerId,
      addressId,
      address: toMailingAddressInput(address),
      setAsDefault: defaultAddress,
    },
  );
  return toUserErrors(data.customerAddressUpdate?.userErrors ?? []);
}

export async function deleteCustomerAddress(addressId: string): Promise<CustomerUserError[]> {
  const session = await requireSession("/account/addresses");
  if (!(await getAddressIds(session.customerId)).includes(addressId)) return NOT_FOUND;

  const data = await adminGraphql<{
    customerAddressDelete: { userErrors: AdminUserError[] } | null;
  }>(
    `mutation DeleteAddress($customerId: ID!, $addressId: ID!) {
      customerAddressDelete(customerId: $customerId, addressId: $addressId) {
        deletedAddressId
        userErrors { field message }
      }
    }`,
    { customerId: session.customerId, addressId },
  );
  return toUserErrors(data.customerAddressDelete?.userErrors ?? []);
}

export async function updateCustomerProfile(input: {
  firstName: string;
  lastName: string;
}): Promise<CustomerUserError[]> {
  const session = await requireSession("/account/profile");
  const data = await adminGraphql<{
    customerUpdate: { userErrors: AdminUserError[] } | null;
  }>(
    `mutation UpdateCustomer($input: CustomerInput!) {
      customerUpdate(input: $input) {
        customer { id }
        userErrors { field message }
      }
    }`,
    { input: { id: session.customerId, firstName: input.firstName, lastName: input.lastName } },
  );
  return toUserErrors(data.customerUpdate?.userErrors ?? []);
}
