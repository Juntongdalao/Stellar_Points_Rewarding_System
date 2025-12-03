// Configure the backend URL + JSON + Authorization and emit UI events
import useAuthStore from "../store/authStore";

export const API_BASE =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

let requestCounter = 0;
const listeners = new Set();

export class ApiError extends Error {
    constructor(message, { status, body, path, method }) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.body = body;
        this.path = path;
        this.method = method;
    }
}

export function subscribeToApiEvents(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function publish(event) {
    listeners.forEach((listener) => {
        try {
            listener(event);
        } catch (err) {
            console.warn("api event listener failed", err);
        }
    });
}

// Helper to call the backend with JSON + optional Bearer token
export async function apiFetch(path, options = {}) {
    const {
        method = "GET",
        headers = {},
        body,
        token: explicitToken,
        toastErrors = true,
        emitProgress = true,
    } = options;

    // Prefer an explicit token if provided, otherwise use the one from Zustand
    const storeState = useAuthStore.getState();
    const token = explicitToken ?? storeState.token;

    const finalHeaders = {
        "Content-Type": "application/json",
        ...headers,
    };

    if (token) {
        finalHeaders.Authorization = `Bearer ${token}`;
    }

    const requestId = ++requestCounter;
    if (emitProgress) {
        publish({
            type: "request:start",
            id: requestId,
            path,
            method,
        });
    }

    try {
        const res = await fetch(`${API_BASE}${path}`, {
            method,
            headers: finalHeaders,
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            const apiError = new ApiError(
                data.error || `Request failed with status ${res.status}`,
                { status: res.status, body: data, path, method },
            );
            if (toastErrors) {
                publish({
                    type: "toast",
                    id: requestId,
                    status: "error",
                    title: "Request failed",
                    message: apiError.message,
                });
            }
            throw apiError;
        }

        return data;
    } catch (error) {
        if (!(error instanceof ApiError) && toastErrors) {
            publish({
                type: "toast",
                id: requestId,
                status: "error",
                title: "Network error",
                message: error.message || "Unknown error",
            });
        }
        throw error;
    } finally {
        if (emitProgress) {
            publish({
                type: "request:finish",
                id: requestId,
                path,
                method,
            });
        }
    }
}
