import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppShell } from "../components/layout";
import { Card, FilterBar } from "../components/ui";
import { apiFetch } from "../lib/apiClient";
import { formatDateTime } from "../lib/date";

const PAGE_SIZE = 6;

export default function UserEventsPage() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [location, setLocation] = useState("");
    const [status, setStatus] = useState("upcoming");
    const [capacityFilter, setCapacityFilter] = useState("available");

    const { data, isLoading, isError, error } = useQuery({
        queryKey: [
            "events",
            { page, search, location, status, capacityFilter },
        ],
        queryFn: () => {
            const params = new URLSearchParams();
            params.set("page", String(page));
            params.set("limit", String(PAGE_SIZE));
            if (search.trim()) params.set("name", search.trim());
            if (location.trim()) params.set("location", location.trim());
            if (status === "upcoming") {
                params.set("started", "false");
            } else if (status === "past") {
                params.set("ended", "true");
            }
            if (capacityFilter === "available") {
                params.set("showFull", "false");
            }
            return apiFetch(`/events?${params.toString()}`);
        },
        keepPreviousData: true,
    });

    const total = data?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const events = data?.results ?? [];

    const joinMutation = useMutation({
        mutationFn: (eventId) =>
            apiFetch(`/events/${eventId}/guests/me`, {
                method: "POST",
                body: {},
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["events"] });
        },
    });

    const leaveMutation = useMutation({
        mutationFn: (eventId) =>
            apiFetch(`/events/${eventId}/guests/me`, {
                method: "DELETE",
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["events"] });
        },
    });

    function handleFilterSubmit(e) {
        e.preventDefault();
        setPage(1);
    }

    return (
        <AppShell
            title="Events"
            subtitle="Browse published events, RSVP, and keep track of attendance."
        >
            <Card>
                <FilterBar onSubmit={handleFilterSubmit}>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text text-xs uppercase text-base-content/60">
                                Search
                            </span>
                        </label>
                        <input
                            className="input input-bordered input-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Name or keyword"
                        />
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text text-xs uppercase text-base-content/60">
                                Location
                            </span>
                        </label>
                        <input
                            className="input input-bordered input-sm"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="City or venue"
                        />
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text text-xs uppercase text-base-content/60">
                                Status
                            </span>
                        </label>
                        <select
                            className="select select-bordered select-sm"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="upcoming">Upcoming</option>
                            <option value="past">Past</option>
                            <option value="all">All</option>
                        </select>
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text text-xs uppercase text-base-content/60">
                                Capacity
                            </span>
                        </label>
                        <select
                            className="select select-bordered select-sm"
                            value={capacityFilter}
                            onChange={(e) => setCapacityFilter(e.target.value)}
                        >
                            <option value="available">Only spots left</option>
                            <option value="all">Include full events</option>
                        </select>
                    </div>
                    <button className="btn btn-primary btn-sm" type="submit">
                        Apply
                    </button>
                </FilterBar>
            </Card>

            {isLoading ? (
                <Card>
                    <div className="flex justify-center py-10">
                        <span className="loading loading-spinner text-primary" />
                    </div>
                </Card>
            ) : isError ? (
                <Card>
                    <p className="text-error">{error?.message}</p>
                </Card>
            ) : events.length === 0 ? (
                <Card>
                    <p className="text-base-content/70">
                        No events match your filters right now.
                    </p>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {events.map((event) => {
                        const isJoining = joinMutation.isLoading;
                        const isLeaving = leaveMutation.isLoading;
                        return (
                            <article
                                key={event.id}
                                className="rounded-2xl border border-base-200 bg-base-100 p-5 shadow-card flex flex-col gap-3"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-lg font-semibold">
                                            {event.name}
                                        </h3>
                                        <p className="text-sm text-base-content/60">
                                            {event.location}
                                        </p>
                                    </div>
                                    <span className="badge badge-outline">
                                        {event.capacity == null
                                            ? `${event.numGuests} guests`
                                            : `${event.numGuests}/${event.capacity} spots`}
                                    </span>
                                </div>
                                <p className="text-sm text-base-content/70">
                                    {formatDateTime(event.startTime)} –{" "}
                                    {formatDateTime(event.endTime)}
                                </p>
                                <div className="mt-auto flex gap-2">
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={() => joinMutation.mutate(event.id)}
                                            disabled={isJoining}
                                        >
                                            Join
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline btn-sm"
                                            onClick={() => leaveMutation.mutate(event.id)}
                                            disabled={isLeaving}
                                        >
                                            Cancel
                                        </button>
                                        <Link to={`/events/${event.id}`} className="btn btn-ghost btn-sm">
                                            Details
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {total > PAGE_SIZE && (
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </button>
                    <span className="text-sm text-base-content/70">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        type="button"
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
