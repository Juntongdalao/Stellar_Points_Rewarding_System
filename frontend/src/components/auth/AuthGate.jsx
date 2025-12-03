import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useAuthStore from "../../store/authStore";
import { apiFetch } from "../../lib/apiClient";

const ROLE_ORDER = { regular: 0, cashier: 1, manager: 2, superuser: 3 };

export function useHasRole(minRole) {
    const user = useAuthStore((s) => s.user);
    return useMemo(() => {
        if (!user) return false;
        const current = ROLE_ORDER[String(user.role || "regular").toLowerCase()] ?? 0;
        const required = ROLE_ORDER[String(minRole).toLowerCase()] ?? 0;
        return current >= required;
    }, [user, minRole]);
}

export default function AuthGate({ children, minRole = "regular", requireRoles }) {
    const token = useAuthStore((s) => s.token);
    const hydrated = useAuthStore((s) => s.hydrated);
    const setAuth = useAuthStore((s) => s.setAuth);
    const refreshProfile = useAuthStore((s) => s.refreshProfile);
    const logout = useAuthStore((s) => s.logout);
    const hasRole = useAuthStore((s) => s.hasRole);
    const location = useLocation();

    const { isLoading, isError } = useQuery({
        queryKey: ["me"],
        enabled: Boolean(token),
        queryFn: () => apiFetch("/users/me"),
        staleTime: 2 * 60 * 1000,
        onSuccess: (profile) => {
            refreshProfile(profile);
            setAuth(token, profile);
        },
    });

    const meetsRole = useHasRole(minRole);
    const requiresSpecificRoles = Array.isArray(requireRoles) && requireRoles.length > 0;
    const meetsSpecificRole = !requiresSpecificRoles || requireRoles.some((role) => hasRole(role));

    if (!hydrated) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <span className="loading loading-spinner loading-lg text-primary" />
            </div>
        );
    }

    if (!token && location.pathname !== "/login") {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (token && isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <span className="loading loading-bars text-primary" />
            </div>
        );
    }

    if (isError && token) {
        logout();
        return <Navigate to="/login" replace />;
    }

    if (!meetsRole || !meetsSpecificRole) {
        return (
            <div className="p-8 text-center text-lg text-error">
                Forbidden: insufficient permissions.
            </div>
        );
    }

    return children;
}
