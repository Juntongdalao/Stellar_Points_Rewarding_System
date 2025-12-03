import { useEffect, useState } from "react";
import { subscribeToApiEvents } from "../../lib/apiClient";

export default function ApiActivityIndicator() {
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const unsubscribe = subscribeToApiEvents((event) => {
            if (event.type === "request:start") {
                setPendingCount((count) => count + 1);
            }
            if (event.type === "request:finish") {
                setPendingCount((count) => Math.max(0, count - 1));
            }
        });
        return unsubscribe;
    }, []);

    return (
        <div
            className={`fixed left-0 top-0 z-40 h-1 w-full transition-opacity duration-200 ${
                pendingCount > 0 ? "opacity-100" : "opacity-0"
            }`}
        >
            <div className="h-full animate-pulse bg-gradient-to-r from-primary via-secondary to-primary" />
        </div>
    );
}
