import InlineSpinner from "./InlineSpinner.jsx";
import ErrorBanner from "./ErrorBanner.jsx";

export default function QueryBoundary({ query, children, loadingLabel, onRetry }) {
    if (query.isLoading) {
        return <InlineSpinner label={loadingLabel ?? "Loading"} className="py-10 justify-center" />;
    }
    if (query.isError) {
        return (
            <ErrorBanner
                message={query.error?.message ?? "Please try again."}
                onRetry={onRetry ?? query.refetch}
            />
        );
    }
    return typeof children === "function" ? children(query.data) : children;
}
