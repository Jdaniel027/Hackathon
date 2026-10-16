import { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface ImagenGaleria {
    id: string;
    src: string;
    alt: string;
}

interface CarruselProps {
    images: ImagenGaleria[];
    initialIndex?: number;
    expanded?: boolean;
    onExpand?: (index: number) => void;
}

const NAV_BUTTON_CLASSES =
    "absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-white transition hover:bg-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:invisible";

const EXPAND_BUTTON_CLASSES =
    "block w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-blue-500";

interface NavButtonProps {
    side: "left" | "right";
    label: string;
    glyph: string;
    disabled: boolean;
    onClick: () => void;
}

function NavButton({ side, label, glyph, disabled, onClick }: NavButtonProps) {
    return (
        <button
            type="button"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={`${NAV_BUTTON_CLASSES} ${
                side === "left" ? "left-2" : "right-2"
            }`}
        >
            <span aria-hidden="true">{glyph}</span>
        </button>
    );
}

function ImagenFallback({ className = "" }: { className?: string }) {
    return (
        <div
            role="img"
            aria-label="Imagen no disponible"
            className={`flex w-full items-center justify-center bg-slate-100 p-4 text-center text-xs text-slate-500 ${className}`}
        >
            No se pudo cargar la imagen
        </div>
    );
}

function Carrusel({
    images,
    initialIndex = 0,
    expanded = false,
    onExpand,
}: CarruselProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const [failedIds, setFailedIds] = useState<Set<string>>(
        () => new Set<string>(),
    );

    // La vista ampliada comienza en la imagen que se seleccionó.
    useLayoutEffect(() => {
        const track = trackRef.current;

        if (track) {
            track.scrollLeft = initialIndex * track.clientWidth;
        }
    }, [initialIndex]);

    function markFailed(id: string) {
        setFailedIds((previous) => new Set(previous).add(id));
    }

    function move(direction: number) {
        const track = trackRef.current;
        if (!track) return;

        const current = Math.round(track.scrollLeft / track.clientWidth);
        const next = Math.max(
            0,
            Math.min(images.length - 1, current + direction),
        );

        const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        track.scrollTo({
            left: next * track.clientWidth,
            behavior: reducedMotion ? "instant" : "smooth",
        });
    }

    return (
        <div
            role="region"
            aria-label={expanded ? "Imágenes ampliadas" : "Imágenes del reporte"}
            className="relative min-w-0"
        >
            <div
                ref={trackRef}
                onScroll={(event) => {
                    const track = event.currentTarget;

                    if (track.clientWidth > 0) {
                        setActiveIndex(
                            Math.round(track.scrollLeft / track.clientWidth),
                        );
                    }
                }}
                className="
          flex snap-x snap-mandatory overflow-x-auto
          overscroll-x-contain rounded-xl
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
        "
            >
                {images.map((image, index) => {
                    const failed = failedIds.has(image.id);
                    const heightClass = expanded ? "h-[75dvh]" : "h-40";

                    return (
                        <div
                            key={image.id}
                            role="group"
                            aria-label={`Imagen ${index + 1} de ${images.length}`}
                            className="w-full shrink-0 snap-center snap-always"
                        >
                            {failed ? (
                                <ImagenFallback className={heightClass} />
                            ) : expanded ? (
                                <img
                                    src={image.src}
                                    alt={image.alt}
                                    draggable={false}
                                    onError={() => markFailed(image.id)}
                                    className={`w-full object-contain ${heightClass}`}
                                />
                            ) : (
                                <button
                                    type="button"
                                    aria-label={`Ampliar imagen: ${image.alt}`}
                                    onClick={() => onExpand?.(index)}
                                    className={EXPAND_BUTTON_CLASSES}
                                >
                                    <img
                                        src={image.src}
                                        alt={image.alt}
                                        loading="lazy"
                                        draggable={false}
                                        onError={() => markFailed(image.id)}
                                        className={`w-full object-cover ${heightClass}`}
                                    />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {images.length > 1 && (
                <>
                    <NavButton
                        side="left"
                        label="Imagen anterior"
                        glyph="‹"
                        disabled={activeIndex === 0}
                        onClick={() => move(-1)}
                    />

                    <NavButton
                        side="right"
                        label="Imagen siguiente"
                        glyph="›"
                        disabled={activeIndex === images.length - 1}
                        onClick={() => move(1)}
                    />

                    <span className="absolute bottom-2 right-3 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
                        {activeIndex + 1} / {images.length}
                    </span>
                </>
            )}
        </div>
    );
}

interface GaleriaImagenesProps {
    images: ImagenGaleria[];
}

export default function GaleriaImagenes({
    images,
}: GaleriaImagenesProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const isOpen = selectedIndex !== null;

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog || !isOpen) return;

        dialog.showModal();

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            dialog.close();
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    if (images.length === 0) return null;

    return (
        <>
            <Carrusel
                images={images}
                onExpand={setSelectedIndex}
            />

            <dialog
                ref={dialogRef}
                aria-label="Visor de imágenes"
                onClose={() => setSelectedIndex(null)}
                className="
          fixed inset-0 m-auto w-[94vw] max-w-4xl
          max-h-[95dvh] overflow-auto rounded-2xl
          border-0 bg-slate-950 p-3 text-white
          backdrop:bg-black/70
        "
            >
                <div className="mb-3 flex justify-end">
                    <button
                        type="button"
                        autoFocus
                        aria-label="Cerrar imagen ampliada"
                        onClick={() => dialogRef.current?.close()}
                        className="flex size-11 items-center justify-center rounded-full bg-white/15 text-xl hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        <span aria-hidden="true">✕</span>
                    </button>
                </div>

                {selectedIndex !== null && (
                    <Carrusel
                        images={images}
                        initialIndex={selectedIndex}
                        expanded
                    />
                )}
            </dialog>
        </>
    );
}
