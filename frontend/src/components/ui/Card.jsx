import { cn } from "../../lib/cn";

export default function Card({
    title,
    actions,
    children,
    className,
    bodyClassName,
}) {
    return (
        <article
            className={cn(
                "rounded-3xl border border-base-200/70 bg-white/95 shadow-card backdrop-blur-sm transition hover:shadow-lg",
                className,
            )}
        >
            {(title || actions) && (
                <header className="flex flex-col gap-4 border-b border-base-200/70 px-6 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        {title && (
                            <h2 className="text-lg font-semibold text-neutral">
                                {title}
                            </h2>
                        )}
                    </div>
                    {actions && (
                        <div className="flex flex-wrap gap-2 text-sm">{actions}</div>
                    )}
                </header>
            )}
            <div className={cn("px-6 py-5", bodyClassName)}>{children}</div>
        </article>
    );
}
