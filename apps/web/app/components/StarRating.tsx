const STAR_PATH =
  "M10 1.5l2.47 5.56 6.03.55-4.57 4 1.36 5.89L10 14.4l-5.29 3.1 1.36-5.89-4.57-4 6.03-.55L10 1.5z";

type StarRatingProps = {
  score: number;
  count?: number;
  size?: "sm" | "md";
  href?: string;
};

function formatScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function Stars({ dimension }: { dimension: string }) {
  return (
    <span className="flex w-max" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => (
        <svg key={index} viewBox="0 0 20 20" className={`${dimension} shrink-0`} fill="currentColor">
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
}

export function StarRating({ score, count, size = "sm", href }: StarRatingProps) {
  const clamped = Math.min(5, Math.max(0, score));
  const dimension = size === "md" ? "size-5" : "size-3.5";
  const label =
    count === undefined
      ? `${formatScore(clamped)} out of 5 stars`
      : `${formatScore(clamped)} out of 5 stars, ${count} reviews`;

  const content = (
    <span role="img" aria-label={label} className="inline-flex items-center gap-1.5">
      <span className="relative inline-flex">
        <span className="text-border">
          <Stars dimension={dimension} />
        </span>
        <span
          className="text-on-surface absolute inset-y-0 start-0 overflow-hidden"
          style={{ width: `${(clamped / 5) * 100}%` }}
        >
          <Stars dimension={dimension} />
        </span>
      </span>
      {count !== undefined ? (
        <span className="text-on-surface-secondary text-sm" aria-hidden="true">
          ({count.toLocaleString("en-US")})
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;
  return (
    <a
      href={href}
      className="focus-visible:outline-accent rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {content}
    </a>
  );
}
