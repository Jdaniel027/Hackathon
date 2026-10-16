import type { ReactNode } from "react";

interface TarjetaResumenProps {
    icon: ReactNode;
    title: string;
    value: string | number;
    description?: string;
}

interface ResumenZonaProps {
    riesgo: TarjetaResumenProps;
    inundacion: TarjetaResumenProps;
    reportes: TarjetaResumenProps;
}

function TarjetaResumen({
    icon,
    title,
    value,
    description,
}: TarjetaResumenProps) {
    return (
        <div className="flex min-w-0 flex-col items-center rounded-2xl bg-gray-50 px-2 py-4 text-center">
            <span
                className="mb-2 flex size-8 items-center justify-center"
                aria-hidden="true"
            >
                {icon}
            </span>

            <h3 className="text-xs font-normal text-gray-500">
                {title}
            </h3>

            <p className="mt-1 max-w-full break-words text-sm font-semibold text-slate-600 sm:text-base">
                {value}
            </p>

            {description && (
                <p className="mt-1 text-[10px] text-gray-500">
                    {description}
                </p>
            )}
        </div>
    );
}

export default function ResumenZona({
    riesgo,
    inundacion,
    reportes,
}: ResumenZonaProps) {
    return (
        <div className="grid grid-cols-3 items-stretch gap-3">
            <TarjetaResumen {...riesgo} />
            <TarjetaResumen {...inundacion} />
            <TarjetaResumen {...reportes} />
        </div>
    );
}