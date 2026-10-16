import { useId, useState } from "react";
import type { ReactNode } from "react";

export type BottomSheetLevel = "compact" | "summary" | "expanded";

interface BottomSheetProps {
    children: ReactNode;
    header?: ReactNode;
    footer?: ReactNode;
    label?: string;
    level?: BottomSheetLevel;
    defaultLevel?: BottomSheetLevel;
    onLevelChange?: (level: BottomSheetLevel) => void;
    heightClasses?: Partial<Record<BottomSheetLevel, string>>;
    className?: string;
}

const DEFAULT_HEIGHT_CLASSES: Record<BottomSheetLevel, string> = {
    compact: "h-[28dvh]",
    summary: "h-[50dvh]",
    expanded: "h-[85dvh]",
};

const NEXT_LEVEL: Record<BottomSheetLevel, BottomSheetLevel> = {
    compact: "summary",
    summary: "expanded",
    expanded: "compact",
};

const HANDLE_LABELS: Record<BottomSheetLevel, string> = {
    compact: "Mostrar resumen del panel",
    summary: "Expandir panel",
    expanded: "Contraer panel",
};

export default function BottomSheet({
    children,
    header,
    footer,
    label = "Panel de información",
    level,
    defaultLevel = "summary",
    onLevelChange,
    heightClasses,
    className = "",
}: BottomSheetProps) {
    const [internalLevel, setInternalLevel] = useState<BottomSheetLevel>(defaultLevel);
    const currentLevel = level ?? internalLevel;
    const contentId = useId();

    const changeLevel = (next: BottomSheetLevel) => {
        if (level === undefined) setInternalLevel(next);
        onLevelChange?.(next);
    };

    const heights = { ...DEFAULT_HEIGHT_CLASSES, ...heightClasses };
    const isExpanded = currentLevel !== "compact";

    return (
        <section
            className={`absolute inset-x-0 bottom-0 z-20 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-3xl bg-white text-slate-900 shadow-[0_-6px_24px_rgba(0,0,0,0.12)] ring-1 ring-slate-200 transition-[height] duration-[250ms] ease-out motion-reduce:transition-none ${heights[currentLevel]} ${className}`}
            aria-label={label}
            data-level={currentLevel}
        >
            <button
                type="button"
                className="flex min-h-7 w-full shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px]"
                onClick={() => changeLevel(NEXT_LEVEL[currentLevel])}
                aria-label={HANDLE_LABELS[currentLevel]}
                aria-expanded={isExpanded}
                aria-controls={contentId}
            >
                <span className="h-[5px] w-11 rounded-full bg-slate-300" />
            </button>

            {header && (
                <header className="shrink-0 border-b border-slate-100 px-5 pb-3.5">
                    {header}
                </header>
            )}

            <div
                id={contentId}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4"
            >
                {children}
            </div>

            {footer && (
                <footer className="shrink-0 border-t border-slate-100 px-5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    {footer}
                </footer>
            )}
        </section>
    );
}
