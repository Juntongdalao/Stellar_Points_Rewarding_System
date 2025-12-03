// Global authentication state using Zustand
// - Stores JWT token and current user object
// - Persists them to localStorage so login survives page refreshes

import { create } from "zustand";
import { apiFetch } from "../lib/apiClient";

const STORAGE_KEY = "stellar_auth_v1"; // key used in localStorage

const useAuthStore = create((set, get) => ({
    user: null,
    token: null,
    hydrated: false, // prevents running hydrate() multiple times
    lastSyncedAt: null,

    // Saves token and user in Zustand, writes them to localStorage after login
    setAuth(token, user) {
        set({ token, user });
        try {
            const payload = JSON.stringify({ token, user });
            window.localStorage.setItem(STORAGE_KEY, payload);
        } catch (err) {
            // If localStorage is blocked or fails, we still keep in-memory state.
            console.warn("Failed to persist auth state:", err);
        }
    },

    hasRole(role) {
        const target = String(role).toLowerCase();
        if (target === "organizer") {
            return !!get().user?.organizer;
        }
        const currentRole = String(get().user?.role || "regular").toLowerCase();
        const order = { regular: 0, cashier: 1, manager: 2, superuser: 3 };
        const required = order[target];
        if (required == null) return false;
        return order[currentRole] >= required;
    },

    logout() {
        set({ token: null, user: null });
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
            console.warn("Failed to clear auth in storage:", err);
        }
    },

    refreshProfile(nextUser) {
        const currentToken = get().token;
        if (!currentToken) return;
        const mergedUser = { ...get().user, ...nextUser };
        set({ user: mergedUser, lastSyncedAt: Date.now() });
        try {
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ token: currentToken, user: mergedUser }),
            );
        } catch (err) {
            console.warn("Failed to persist refreshed profile:", err);
        }
    },

    // Clears auth from Zustand, removes it from localStorage
    async fetchProfile() {
        const token = get().token;
        if (!token) return null;
        const me = await apiFetch("/users/me", { token, toastErrors: false });
        get().refreshProfile(me);
        return me;
    },

    // Hydration: Reads from localStorage ONCE (at app startup) and restores token + user
    // Not Middleware!
    hydrate() {
        if (get().hydrated) return; // only run once
        let restored = { token: null, user: null };
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                // Defensive: only accept if both fields exist
                restored = { token: parsed.token, user: parsed.user };
            }
        } catch (err) {
            console.warn("Failed to hydrate auth state:", err);
        }
        set({
            token: restored.token,
            user: restored.user,
            hydrated: true,
        });
    }
}));

export default useAuthStore;
