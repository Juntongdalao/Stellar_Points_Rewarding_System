import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppShell } from "../components/layout";
import { Card, FilterBar } from "../components/ui";
import { QueryBoundary } from "../components/feedback";
import { apiFetch } from "../lib/apiClient";
import { formatDateTime } from "../lib/date";

const PAGE_SIZE = 6;

export default function UserEventsPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [location, setLocation] = useState("");
    const [status, setStatus] = useState("upcoming");
    const [capacityFilter, setCapacityFilter] = useState("available");
    const loadMoreRef = useRef(null);

    const filters = useMemo(
        () => ({
            search,
            location,
            status,
            capacityFilter,
        }),
        [search, location, status, capacityFilter],
    );

    const eventsQuery = useInfiniteQuery({
        queryKey: ["events", filters],
        queryFn: ({ pageParam = 1 }) => {
            const params = new URLSearchParams();
            params.set("page", String(pageParam));
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
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.reduce((sum, page) => sum + page.results.length, 0);
            if (loaded >= (lastPage.count ?? 0)) {
                return undefined;
            }
            return allPages.length + 1;
        },
    });
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = eventsQuery;
    const total = data?.pages?.[0]?.count ?? 0;
    const events = useMemo(
        () => data?.pages?.flatMap((page) => page.results) ?? [],
        [data],
    );

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

    const handleFilterSubmit = useCallback((e) => {
        e.preventDefault();
    }, []);

    useEffect(() => {
        const node = loadMoreRef.current;
        if (!node || !hasNextPage) return undefined;
        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { rootMargin: "200px" },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handleJoin = useCallback(
        (eventId) => joinMutation.mutate(eventId),
        [joinMutation],
    );
    const handleLeave = useCallback(
        (eventId) => leaveMutation.mutate(eventId),
        [leaveMutation],
    );

    return (
        <AppShell
            title="Events"
            subtitle="Browse published events, RSVP, and keep track of attendance."
        >
            <Card>
                <FilterBar onSubmit={handleFilterSubmit}>
                    <div className="space-y-2">
                        <label className="text-xs uppercase text-base-content/60 pl-1">
                            Search
                        </label>
                        <input
                            className="input input-bordered input-sm rounded-2xl border border-brand-200 bg-white px-3 py-2 text-sm text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Name or keyword"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs uppercase text-base-content/60 pl-1">
                            Location
                        </label>
                        <input
                            className="input input-bordered input-sm rounded-2xl border border-brand-200 bg-white px-3 py-2 text-sm text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="City or venue"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs uppercase text-base-content/60 pl-1">
                            Status
                        </label>
                        <select
                            className="select select-bordered select-sm rounded-2xl border border-brand-200 bg-white px-3 py-2 text-sm text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="upcoming">Upcoming</option>
                            <option value="past">Past</option>
                            <option value="all">All</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs uppercase text-base-content/60 pl-1">
                            Capacity
                        </label>
                        <select
                            className="select select-bordered select-sm rounded-2xl border border-brand-200 bg-white px-3 py-2 text-sm text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
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

            <QueryBoundary query={eventsQuery} loadingLabel="Loading events…">
                {events.length === 0 ? (
                    <Card>
                        <p className="text-base-content/70">
                            No events match your filters right now.
                        </p>
                    </Card>
                ) : (
                    <>
                        <div className="grid gap-4 md:grid-cols-2">
                            {events.map((event) => (
                                <article
                                    key={event.id}
                                    className="flex flex-col gap-3 rounded-2xl border border-base-200 bg-base-100 p-5 shadow-card"
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
                                    <div className="mt-auto flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleJoin(event.id)}
                                            disabled={joinMutation.isLoading}
                                        >
                                            Join
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline btn-sm"
                                            onClick={() => handleLeave(event.id)}
                                            disabled={leaveMutation.isLoading}
                                        >
                                            Cancel
                                        </button>
                                        <Link to={`/events/${event.id}`} className="btn btn-ghost btn-sm">
                                            Details
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                        <div
                            ref={loadMoreRef}
                            className="py-6 text-center text-sm text-base-content/60"
                        >
                            {hasNextPage ? (
                                isFetchingNextPage ? (
                                    <span className="loading loading-dots loading-sm" />
                                ) : (
                                    "Scroll to load more events…"
                                )
                            ) : total > 0 ? (
                                "You have reached the end."
                            ) : null}
                        </div>
                    </>
                )}
            </QueryBoundary>
        </AppShell>
    );
}
