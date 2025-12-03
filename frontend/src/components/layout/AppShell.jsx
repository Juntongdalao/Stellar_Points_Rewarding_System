import { cn } from "../../lib/cn";

export default function AppShell({
    title,
    subtitle,
    actions,
    children,
    className,
}) {
    return (
        <div
            className={cn(
                "min-h-screen bg-gradient-to-b from-surface-50 via-white to-surface-100",
                className,
            )}
        >
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-12 pt-8 md:px-8">
                <section className="rounded-3xl border border-base-200 bg-white/90 p-6 shadow-lg">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            {title && (
                                <h1 className="text-2xl font-semibold text-neutral md:text-3xl">
                                    {title}
                                </h1>
                            )}
                            {subtitle && (
                                <p className="mt-1 text-base text-neutral/70">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        {actions && (
                            <div className="flex flex-wrap items-center gap-3">{actions}</div>
                        )}
                    </div>
                </section>
                <section className="flex flex-col gap-6">{children}</section>
            </main>
        </div>
    );
}
