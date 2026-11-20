export type StorefrontConfig = {
  /** e.g. your-store.myshopify.com */
  domain: string;
  /** Public Storefront API access token */
  token: string;
  /** e.g. a dated version string from Shopify's API versioning */
  apiVersion: string;
};

export type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

export function createStorefrontClient(config: StorefrontConfig) {
  const endpoint = `https://${config.domain}/api/${config.apiVersion}/graphql.json`;

  async function query<T>(
    document: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": config.token,
      },
      body: JSON.stringify({ query: document, variables }),
    });

    if (!res.ok) {
      throw new Error(`Storefront API error: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as GraphQLResponse<T>;
    if (json.errors?.length) {
      throw new Error(json.errors.map((e) => e.message).join("; "));
    }
    if (!json.data) {
      throw new Error("Storefront API returned no data");
    }
    return json.data;
  }

  return { query };
}