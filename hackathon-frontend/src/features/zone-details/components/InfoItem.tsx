import type { ReactNode } from "react";

interface InfoItemProps {
  icon: ReactNode;
  title: string;
  description?: string;
  metadata?: string;
  badge?: ReactNode;
  variant?: "default" | "compact";
  divider?: boolean;
}

export default function InfoItem({
  icon,
  title,
  description,
  metadata,
  badge,
  variant = "default",
  divider = false,
}: InfoItemProps) {
  const compact = variant === "compact";

  return (
    <div
      className={[
        "flex items-start gap-3",
        compact ? "py-2" : "py-4",
        divider ? "border-b border-slate-100" : "",
      ].join(" ")}
    >
      <span
        className="flex size-6 shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3
            className={
              compact
                ? "text-xs font-medium text-slate-900"
                : "text-sm font-semibold text-slate-700"
            }
          >
            {title}
          </h3>

          {badge && (
            <div className="shrink-0">
              {badge}
            </div>
          )}
        </div>

        {description && (
          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        )}

        {metadata && (
          <p
            className={
              compact
                ? "text-[10px] text-slate-400"
                : "mt-2 text-[10px] text-slate-400"
            }
          >
            {metadata}
          </p>
        )}
      </div>
    </div>
  );
}