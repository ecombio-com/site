import type { CacheInstance } from "@shopify/hydrogen";

// Yotpo storefront reads are public (no token); the store ID is the public app key.
// The CDN sends `Cache-Control: no-store` and can lag by hours, so every response is
// cached here instead. Every failure resolves to null: reviews must never break a page.

const API = "https://api-cdn.yotpo.com/v3/storefront/store";
const CACHE_SECONDS = 60 * 60;
const TIMEOUT_MS = 4000;

export type YotpoOptions = {
  storeId?: string;
  cache: CacheInstance;
  waitUntil: ExecutionContext["waitUntil"];
};

export type YotpoRating = { averageScore: number; totalReviews: number };

export type YotpoReview = {
  id: number;
  score: number;
  title: string;
  content: string;
  createdAt: string;
  verifiedBuyer: boolean;
  isIncentivized: boolean;
  displayName: string;
  reply: string | null;
};

export type YotpoReviews = {
  rating: YotpoRating;
  starDistribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  total: number;
  reviews: YotpoReview[];
};

type RatingsBody = {
  bottomline?: { totalReviews?: number; averageScore?: number };
};

type ReviewsBody = {
  pagination?: { total?: number };
  bottomline?: {
    totalReview?: number;
    averageScore?: number;
    starDistribution?: Record<string, number>;
  };
  reviews?: Array<{
    id: number;
    score: number;
    title?: string | null;
    content?: string | null;
    createdAt: string;
    verifiedBuyer?: boolean;
    isIncentivized?: boolean;
    user?: { displayName?: string | null } | null;
    comment?: { content?: string | null } | null;
  }>;
};

/** Shopify GID (gid://shopify/Product/123) -> the numeric ID Yotpo uses. */
export function toYotpoProductId(gid: string): string | null {
  const id = gid.split("/").pop() ?? "";
  return /^\d+$/.test(id) ? id : null;
}

function toRating(score?: number, count?: number): YotpoRating | null {
  if (!score || !count) return null;
  return { averageScore: Math.round(score * 10) / 10, totalReviews: count };
}

async function fetchJson(url: string, { cache, waitUntil }: YotpoOptions): Promise<unknown> {
  const key = new Request(url);
  try {
    const hit = await cache.match(key);
    if (hit) return await hit.json();

    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const body = await response.text();
    waitUntil(
      cache
        .put(
          key,
          new Response(body, {
            headers: {
              "content-type": "application/json",
              "cache-control": `public, max-age=${CACHE_SECONDS}`,
            },
          }),
        )
        .catch(() => undefined),
    );
    return JSON.parse(body);
  } catch (error) {
    console.error("[yotpo] request failed", url, error);
    return null;
  }
}

function productUrl(options: YotpoOptions, gid: string, path: string): string | null {
  const id = toYotpoProductId(gid);
  if (!options.storeId || !id) return null;
  return `${API}/${options.storeId}/product/${id}/${path}`;
}

export async function getProductRating(
  options: YotpoOptions,
  gid: string,
): Promise<YotpoRating | null> {
  const url = productUrl(options, gid, "ratings");
  if (!url) return null;
  const body = (await fetchJson(url, options)) as RatingsBody | null;
  return toRating(body?.bottomline?.averageScore, body?.bottomline?.totalReviews);
}

export async function getRatingsForProducts(
  options: YotpoOptions,
  gids: string[],
): Promise<Record<string, YotpoRating | null>> {
  const entries = await Promise.all(
    gids.map(async (gid) => [gid, await getProductRating(options, gid)] as const),
  );
  return Object.fromEntries(entries);
}

export async function getProductReviews(
  options: YotpoOptions,
  gid: string,
  { perPage = 10 }: { perPage?: number } = {},
): Promise<YotpoReviews | null> {
  const url = productUrl(options, gid, `reviews?page=1&perPage=${perPage}&sort=date&direction=desc`);
  if (!url) return null;

  const body = (await fetchJson(url, options)) as ReviewsBody | null;
  const rating = toRating(body?.bottomline?.averageScore, body?.bottomline?.totalReview);
  const reviews = (body?.reviews ?? []).map((review) => ({
    id: review.id,
    score: review.score,
    title: review.title ?? "",
    content: review.content ?? "",
    createdAt: review.createdAt,
    verifiedBuyer: Boolean(review.verifiedBuyer),
    isIncentivized: Boolean(review.isIncentivized),
    displayName: review.user?.displayName ?? "",
    reply: review.comment?.content ?? null,
  }));
  if (!rating || reviews.length === 0) return null;

  const distribution = body?.bottomline?.starDistribution ?? {};
  return {
    rating,
    total: body?.pagination?.total ?? rating.totalReviews,
    reviews,
    starDistribution: {
      "1": Number(distribution["1"] ?? 0),
      "2": Number(distribution["2"] ?? 0),
      "3": Number(distribution["3"] ?? 0),
      "4": Number(distribution["4"] ?? 0),
      "5": Number(distribution["5"] ?? 0),
    },
  };
}
