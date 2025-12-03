import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../components/layout";
import { Card, FilterBar } from "../components/ui";
import { apiFetch } from "../lib/apiClient";
import { formatDateTime } from "../lib/date";
import useAuthStore from "../store/authStore";

export default function OrganizerEventsPage() {
    const [page, setPage] = useState(1);
    const [name, setName] = useState("");
    const [locationFilter, setLocationFilter] = useState("");
    const isOrganizer = useAuthStore((s) => !!s.user?.organizer);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["organizer-events", { page, name, locationFilter }],
        queryFn: () => {
            const params = new URLSearchParams();
            params.set("page", String(page));
            params.set("limit", "8");
            if (name.trim()) params.set("name", name.trim());
            if (locationFilter.trim()) params.set("location", locationFilter.trim());
            return apiFetch(`/organizer/events?${params.toString()}`);
        },
    });

    const events = data?.results ?? [];
    const total = data?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / 8));

    function handleFilterSubmit(e) {
        e.preventDefault();
        setPage(1);
    }

    if (!isOrganizer) {
        return (
            <AppShell title="Organizer events">
                <Card>You are not assigned as an organizer.</Card>
            </AppShell>
        );
    }

    return (
        <AppShell title="Organizer events" subtitle="Events you are responsible for.">
            <Card>
                <FilterBar onSubmit={handleFilterSubmit}>
                    <input
                        className="input input-bordered input-sm"
                        placeholder="Search by name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <input
                        className="input input-bordered input-sm"
                        placeholder="Filter by location"
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                    />
                    <button className="btn btn-primary btn-sm" type="submit">
                        Apply
                    </button>
                </FilterBar>
            </Card>
            {isLoading ? (
                <Card>
                    <div className="flex justify-center py-8">
                        <span className="loading loading-spinner text-primary" />
                    </div>
                </Card>
            ) : isError ? (
                <Card>
                    <p className="text-error">{error?.message}</p>
                </Card>
            ) : events.length === 0 ? (
                <Card>
                    <p className="text-neutral/70">You are not assigned to any events.</p>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {events.map((event) => (
                        <article
                            key={event.id}
                            className="rounded-3xl border border-base-200/70 bg-white/90 p-5 shadow-card"
                            data-cy="organizer-event-card"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold">{event.name}</h3>
                                    <p className="text-sm text-neutral/70">{event.location}</p>
                                </div>
                                <span className="badge badge-ghost">
                                    {event.numGuests}/{event.capacity ?? "∞"}
                                </span>
                            </div>
                            <p className="mt-2 text-sm text-neutral/70">
                                {formatDateTime(event.startTime)} – {formatDateTime(event.endTime)}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-3">
                                <Link
                                    className="btn btn-outline btn-sm"
                                    to={`/organizer/events/${event.id}`}
                                    data-cy="organizer-manage-event"
                                >
                                    Manage event
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            )}
            {total > 8 && (
                <div className="mt-4 flex items-center justify-between">
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </button>
                    <span className="text-sm text-neutral/70">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                        disabled={page >= totalPages}
                    >
                        Next
                    </button>
                </div>
            )}
        </AppShell>
    );
}
