"use client";

import { useId } from "react";

export default function RatingStars({
  value,
  className = "",
  size = 14,
  showValue = true,
}: {
  value: number;
  className?: string;
  size?: number;
  showValue?: boolean;
}) {
  // React useId() can contain ":" which may break SVG url(#id) in some browsers.
  const rawId = useId();
  const id = rawId.replace(/[:]/g, "");
  const v = Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, idx) => {
          const starIndex = idx + 1;
          const fill = Math.max(0, Math.min(1, v - (starIndex - 1)));
          const clipId = `${id}-clip-${idx}`;
          return (
            <svg
              key={idx}
              width={size}
              height={size}
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="block"
            >
              <defs>
                <clipPath id={clipId}>
                  <rect x="0" y="0" width={24 * fill} height="24" />
                </clipPath>
              </defs>

              {/* base */}
              <path
                d="M12 17.3 5.8 20.6l1.2-7.1-5.2-5 7.2-1 3.2-6.5 3.2 6.5 7.2 1-5.2 5 1.2 7.1L12 17.3Z"
                fill="rgb(71 85 105)" /* slate-600 */
                opacity="0.7"
              />
              {/* filled */}
              <path
                d="M12 17.3 5.8 20.6l1.2-7.1-5.2-5 7.2-1 3.2-6.5 3.2 6.5 7.2 1-5.2 5 1.2 7.1L12 17.3Z"
                fill="rgb(250 204 21)" /* amber-400 */
                clipPath={`url(#${clipId})`}
              />
            </svg>
          );
        })}
      </div>
      {showValue && (
        <span className="text-[11px] font-semibold text-slate-200">
          {v > 0 ? v.toFixed(1) : "—"}
        </span>
      )}
    </div>
  );
}

