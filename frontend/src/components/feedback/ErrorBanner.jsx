import { cn } from "../../lib/cn";

export default function ErrorBanner({
    title = "Something went wrong",
    message,
    onRetry,
    className = "",
}) {
    return (
        <div className={cn("alert alert-error shadow-sm", className)} role="alert">
            <div>
                <p className="font-semibold">{title}</p>
                {message && <p className="text-sm opacity-80">{message}</p>}
            </div>
            {onRetry && (
                <button type="button" className="btn btn-sm" onClick={onRetry}>
                    Retry
                </button>
            )}
        </div>
    );
}
