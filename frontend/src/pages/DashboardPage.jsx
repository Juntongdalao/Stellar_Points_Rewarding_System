import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppShell } from "../components/layout";
import { Card } from "../components/ui";
import { apiFetch } from "../lib/apiClient";
import { formatDateTime } from "../lib/date";

export default function DashboardPage() {
    const { data: me, isLoading: meLoading } = useQuery({
        queryKey: ["me"],
        queryFn: () => apiFetch("/users/me"),
    });

    const { data: txData, isLoading: txLoading } = useQuery({
        queryKey: ["my-transactions", { page: 1, limit: 5 }],
        queryFn: () => apiFetch("/users/me/transactions?page=1&limit=5"),
    });

    const { data: eventsData, isLoading: eventsLoading } = useQuery({
        queryKey: ["events", "dashboard"],
        queryFn: () => apiFetch("/events?page=1&limit=3&showFull=false"),
    });

    const { data: promosData, isLoading: promosLoading } = useQuery({
        queryKey: ["promotions", "dashboard"],
        queryFn: () => apiFetch("/promotions?page=1&limit=3"),
    });

    const recentTransactions = txData?.results ?? [];
    const upcomingEvents = eventsData?.results ?? [];
    const promotions = promosData?.results ?? [];

    return (
        <AppShell
            title="Welcome back"
            subtitle="Track your loyalty status, pending actions, and upcoming experiences."
        >
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <p className="text-sm uppercase text-base-content/60">Points</p>
                    <p className="text-3xl font-semibold">
                        {meLoading ? "…" : me?.points ?? 0}
                    </p>
                </Card>
                <Card>
                    <p className="text-sm uppercase text-base-content/60">Verified</p>
                    <p className="text-2xl font-semibold">
                        {meLoading ? "…" : me?.verified ? "Yes" : "Pending"}
                    </p>
                </Card>
                <Card>
                    <p className="text-sm uppercase text-base-content/60">Role</p>
                    <p className="text-2xl font-semibold capitalize">
                        {meLoading ? "…" : me?.role ?? "regular"}
                    </p>
                </Card>
                <Card>
                    <p className="text-sm uppercase text-base-content/60">Last login</p>
                    <p className="text-lg font-semibold">
                        {meLoading ? "…" : formatDateTime(me?.lastLogin)}
                    </p>
                </Card>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card
                    title={<span className="text-base-content/80">Recent transactions</span>}
                    actions={<Link to="/me/transactions" className="btn btn-link btn-sm">View all</Link>}
                >
                    {txLoading ? (
                        <div className="flex justify-center py-6">
                            <span className="loading loading-spinner text-primary" />
                        </div>
                    ) : recentTransactions.length === 0 ? (
                        <p className="text-base-content/70">No activity yet.</p>
                    ) : (
                        <ul className="divide-y divide-base-200">
                            {recentTransactions.map((tx) => (
                                <li key={tx.id} className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="font-medium capitalize">{tx.type}</p>
                                        <p className="text-sm text-base-content/60">
                                            #{tx.id}{tx.remark ? ` · ${tx.remark}` : ""}
                                        </p>
                                    </div>
                                    <span className={tx.amount >= 0 ? "text-success font-semibold" : "text-error font-semibold"}>
                                        {tx.amount >= 0 ? "+" : "-"}
                                        {Math.abs(tx.amount)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card
                    title={<span className="text-base-content/80">Upcoming events</span>}
                    actions={<Link to="/events" className="btn btn-link btn-sm">Browse events</Link>}
                >
                    {eventsLoading ? (
                        <div className="flex justify-center py-6">
                            <span className="loading loading-spinner text-primary" />
                        </div>
                    ) : upcomingEvents.length === 0 ? (
                        <p className="text-base-content/70">No upcoming events.</p>
                    ) : (
                        <ul className="space-y-3">
                            {upcomingEvents.map((event) => (
                                <li key={event.id} className="rounded-xl border border-base-200 p-4">
                                    <p className="font-semibold">{event.name}</p>
                                    <p className="text-sm text-base-content/60">
                                        {formatDateTime(event.startTime)} · {event.location}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            <Card
                title={<span className="text-base-content/80">Active promotions</span>}
                actions={<Link to="/me/promotions" className="btn btn-link btn-sm">View all</Link>}
            >
                {promosLoading ? (
                    <div className="flex justify-center py-6">
                        <span className="loading loading-spinner text-primary" />
                    </div>
                ) : promotions.length === 0 ? (
                    <p className="text-base-content/70">No promotions available.</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {promotions.map((promo) => (
                            <div key={promo.id} className="rounded-2xl border border-base-200 bg-base-100 p-4">
                                <p className="font-semibold">{promo.name}</p>
                                <p className="text-sm text-base-content/60">
                                    Ends {formatDateTime(promo.endTime)}
                                </p>
                                <p className="mt-3 text-sm">
                                    {promo.points ? `${promo.points} bonus pts` : "Rate bonus"}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </AppShell>
    );
}
