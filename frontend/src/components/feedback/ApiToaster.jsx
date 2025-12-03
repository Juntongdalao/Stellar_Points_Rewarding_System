import { useEffect, useState } from "react";
import { subscribeToApiEvents } from "../../lib/apiClient";
import { cn } from "../../lib/cn";

const STATUS_TO_TONE = {
    error: "alert-error",
    success: "alert-success",
    info: "alert-info",
    warning: "alert-warning",
};

export default function ApiToaster() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const unsubscribe = subscribeToApiEvents((event) => {
            if (event.type !== "toast") return;
            setToasts((prev) => {
                const next = [...prev, { ...event, createdAt: Date.now() }];
                return next.slice(-4);
            });
            setTimeout(() => {
                setToasts((prev) => prev.filter((toast) => toast.id !== event.id));
            }, event.duration ?? 4000);
        });
        return unsubscribe;
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3 md:bottom-8 md:right-8 md:max-w-md">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={cn(
                        "alert pointer-events-auto shadow-lg",
                        STATUS_TO_TONE[toast.status] ?? "alert-info",
                    )}
                >
                    <div>
                        <h3 className="font-semibold">{toast.title}</h3>
                        <div className="text-sm opacity-80">{toast.message}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
