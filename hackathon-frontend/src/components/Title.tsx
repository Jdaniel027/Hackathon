import type { ReactNode } from "react";

interface TitleProps {
    mainTitle: string;
    secondTitle?: string;
    icon?: ReactNode;
}

export default function Title({
    mainTitle,
    secondTitle,
    icon,
}: TitleProps) {
    return (
        <div className="flex items-center">
            {icon && (
                <span className="m-0.5 p-0.5" aria-hidden="true">
                    {icon}
                </span>
            )}
            <div>
                <h1 className="text-[30px] font-bold">{mainTitle}</h1>
                {secondTitle && (
                    <h2 className="text-[15px]">{secondTitle}</h2>
                )}
            </div>
        </div>
    );
}