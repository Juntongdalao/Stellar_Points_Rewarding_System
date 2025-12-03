import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../components/layout";
import { Card } from "../components/ui";
import { apiFetch } from "../lib/apiClient";
import { formatDateTime } from "../lib/date";

export default function MyPointsPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["me"],
        queryFn: () => apiFetch("/users/me"),
    });

    if (isLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <span className="loading loading-spinner loading-lg text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <AppShell title="My Points">
                <Card>
                    <p className="text-error">{error.message}</p>
                </Card>
            </AppShell>
        );
    }

    const me = data || {};

    return (
        <AppShell title="My Points" subtitle="Account status and loyalty progress.">
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <p className="text-sm uppercase text-base-content/60">UTORid</p>
                    <p className="text-2xl font-semibold">{me.utorid}</p>
                </Card>
                <Card>
                    <p className="text-sm uppercase text-base-content/60">Role</p>
                    <p className="text-2xl font-semibold capitalize">{me.role}</p>
                </Card>
                <Card>
                    <p className="text-sm uppercase text-base-content/60">Verified</p>
                    <p className="text-2xl font-semibold">
                        {me.verified ? "Yes" : "Pending"}
                    </p>
                </Card>
                <Card>
                    <p className="text-sm uppercase text-base-content/60">Points</p>
                    <p className="text-3xl font-bold text-primary">{me.points ?? 0}</p>
                </Card>
                <Card>
                    <p className="text-sm uppercase text-base-content/60">Created</p>
                    <p className="text-lg font-semibold">
                        {formatDateTime(me.createdAt)}
                    </p>
                </Card>
                <Card>
                    <p className="text-sm uppercase text-base-content/60">Last login</p>
                    <p className="text-lg font-semibold">
                        {formatDateTime(me.lastLogin)}
                    </p>
                </Card>
            </section>
        </AppShell>
    );
}
