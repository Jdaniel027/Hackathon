import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    isLoading?: boolean;
    children: ReactNode;
}

const BASE_CLASSES =
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary:
        "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
    sm: "min-h-9 px-3 text-xs",
    md: "min-h-11 px-4 text-sm",
};

export default function Button({
    variant = "secondary",
    size = "md",
    fullWidth = false,
    isLoading = false,
    disabled,
    type = "button",
    className = "",
    children,
    ...rest
}: ButtonProps) {
    const classes = [
        BASE_CLASSES,
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? "w-full" : "",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <button
            {...rest}
            type={type}
            className={classes}
            disabled={disabled || isLoading}
            aria-busy={isLoading || undefined}
        >
            {isLoading && (
                <span
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
            )}
            {children}
        </button>
    );
}
