import { StarRating } from "~/components/StarRating";
import type { YotpoReviews } from "~/lib/yotpo";

const DISTRIBUTION_ROWS = ["5", "4", "3", "2", "1"] as const;

// Yotpo timestamps carry no timezone. Format from the date parts in UTC so the
// server and the browser always render the same text.
function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ReviewsSection({ yotpo }: { yotpo: YotpoReviews | null }) {
  if (!yotpo) return null;

  const { rating, starDistribution, reviews, total } = yotpo;
  const distributionTotal =
    DISTRIBUTION_ROWS.reduce((sum, key) => sum + starDistribution[key], 0) || 1;

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="scroll-mt-20 py-4">
      <div className="border-border border-t pt-12">
        <h2
          id="reviews-heading"
          className="type-heading-xl max-w-page px-margin mx-auto mb-8"
        >
          Reviews
        </h2>
        <div className="max-w-page px-margin mx-auto grid gap-10 md:grid-cols-[18rem_1fr] md:gap-16">
          <div>
            <p className="type-heading-xl text-on-surface">{rating.averageScore.toFixed(1)}</p>
            <div className="mt-2">
              <StarRating score={rating.averageScore} size="md" />
            </div>
            <p className="type-body-sm text-on-surface-secondary mt-2">
              {rating.totalReviews.toLocaleString("en-US")} reviews
            </p>
            <ul role="list" className="mt-6 grid gap-2" aria-label="Rating breakdown">
              {DISTRIBUTION_ROWS.map((key) => (
                <li key={key} className="flex items-center gap-3 text-sm">
                  <span className="text-on-surface w-12 shrink-0">{key} star</span>
                  <span className="bg-surface-secondary h-2 flex-1" aria-hidden="true">
                    <span
                      className="bg-on-surface block h-full"
                      style={{ width: `${(starDistribution[key] / distributionTotal) * 100}%` }}
                    />
                  </span>
                  <span className="text-on-surface-secondary w-10 shrink-0 text-end">
                    {starDistribution[key].toLocaleString("en-US")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <ul role="list" className="divide-border divide-y">
              {reviews.map((review) => (
                <li key={review.id} className="py-6 first:pt-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StarRating score={review.score} />
                    {review.verifiedBuyer ? (
                      <span className="text-on-surface-secondary text-xs font-medium">
                        Verified buyer
                      </span>
                    ) : null}
                  </div>
                  {review.title ? (
                    <h3 className="type-heading-md text-on-surface mt-3">{review.title}</h3>
                  ) : null}
                  {review.content ? (
                    <p className="type-body text-on-surface mt-1 whitespace-pre-line">
                      {review.content}
                    </p>
                  ) : null}
                  <p className="type-body-sm text-on-surface-secondary mt-3">
                    {review.displayName || "Anonymous"} &middot; {formatDate(review.createdAt)}
                  </p>
                  {review.isIncentivized ? (
                    <p className="type-body-sm text-on-surface-secondary mt-1">
                      Incentivized review
                    </p>
                  ) : null}
                  {review.reply ? (
                    <div className="bg-surface-secondary mt-4 p-4">
                      <p className="type-body-sm text-on-surface font-medium">Reply from the store</p>
                      <p className="type-body-sm text-on-surface-secondary mt-1 whitespace-pre-line">
                        {review.reply}
                      </p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            {total > reviews.length ? (
              <p className="type-body-sm text-on-surface-secondary border-border border-t pt-6">
                Showing {reviews.length} of {total.toLocaleString("en-US")} reviews
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
