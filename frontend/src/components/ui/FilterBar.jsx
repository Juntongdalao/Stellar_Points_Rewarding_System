import { cn } from "../../lib/cn";

export default function FilterBar({ children, className, onSubmit, onReset }) {
    return (
        <form
            onSubmit={onSubmit}
            onReset={onReset}
            className={cn(
                "flex flex-col gap-4 rounded-2xl border border-base-200/70 bg-white/90 p-4 shadow-sm md:flex-row md:flex-wrap md:items-end",
                className,
            )}
        >
            {children}
        </form>
    );
}
