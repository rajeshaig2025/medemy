import Link from "next/link";

export function RatingStars({
  rating,
  count,
  className = "",
}: {
  rating: number;
  count?: number;
  className?: string;
}) {
  const rounded = Math.round(rating * 2) / 2;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span aria-hidden className="flex text-accent-500">
        {[1, 2, 3, 4, 5].map((star) => {
          if (rounded >= star) return <StarGlyph key={star} fill="currentColor" />;
          if (rounded >= star - 0.5) return <StarGlyph key={star} fill="currentColor" half />;
          return <StarGlyph key={star} />;
        })}
      </span>
      <span className="sr-only">Rated {rating.toFixed(1)} out of 5</span>
      <span className="text-sm font-semibold text-ink-900">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-sm text-ink-500">({count})</span>}
    </span>
  );
}

function StarGlyph({ fill, half }: { fill?: string; half?: boolean }) {
  if (half) {
    return (
      <svg viewBox="0 0 20 20" className="size-4">
        <defs>
          <linearGradient id="half-star">
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path
          d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.77l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85z"
          fill="url(#half-star)"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-4"
      fill={fill ?? "none"}
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.77l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85z" />
    </svg>
  );
}

export function CourseCard({
  course,
  href,
}: {
  course: {
    slug: string;
    title: string;
    subtitle?: string | null;
    thumbnailUrl?: string | null;
    rating: number;
    reviewCount: number;
    lessonCount: number;
    durationSeconds: number;
    level: string;
    priceCents: number;
    instructorName: string;
    categoryName?: string | null;
  };
  href?: string;
}) {
  const target = href ?? `/courses/${course.slug}`;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-ink-200 bg-white transition hover:border-ink-300 hover:shadow-md">
      <Link href={target} className="block">
        <div className="relative aspect-video overflow-hidden bg-ink-200">
          {course.thumbnailUrl ? (
            // Thumbnails are user-supplied URLs from arbitrary hosts, so a
            // plain <img> avoids needing to register every domain in
            // next.config. Decorative here, and the title below carries the
            // accessible name.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.thumbnailUrl}
              alt=""
              loading="lazy"
              className="size-full object-cover transition group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid size-full place-items-center bg-gradient-to-br from-brand-500 to-brand-800 text-white">
              <span className="px-4 text-center text-sm font-semibold line-clamp-2">
                {course.title}
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {course.categoryName && (
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            {course.categoryName}
          </p>
        )}
        <h3 className="font-semibold leading-snug">
          <Link href={target} className="hover:text-brand-700">
            <span className="line-clamp-2">{course.title}</span>
          </Link>
        </h3>
        {course.subtitle && (
          <p className="line-clamp-2 text-sm text-ink-500">{course.subtitle}</p>
        )}
        <p className="text-sm text-ink-600">{course.instructorName}</p>

        {course.reviewCount > 0 ? (
          <RatingStars rating={course.rating} count={course.reviewCount} />
        ) : (
          <p className="text-sm text-ink-400">No ratings yet</p>
        )}

        <div className="mt-auto pt-2 text-xs text-ink-500">
          <p>
            {course.lessonCount} lesson{course.lessonCount === 1 ? "" : "s"} ·{" "}
            {formatDuration(course.durationSeconds)} · {formatLevel(course.level)}
          </p>
          <p className="mt-1 text-base font-bold text-ink-900">
            {course.priceCents === 0 ? "Free" : `$${(course.priceCents / 100).toFixed(2)}`}
          </p>
        </div>
      </div>
    </article>
  );
}

export function formatDuration(totalSeconds: number) {
  if (!totalSeconds) return "0m";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export function formatLevel(level: string) {
  return level
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
