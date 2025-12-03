import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../components/layout";
import { Card, FilterBar, DataTable } from "../components/ui";
import { apiFetch } from "../lib/apiClient";
import { formatDateTime } from "../lib/date";

const PAGE_SIZE = 8;

const emptyEventForm = {
    name: "",
    description: "",
    location: "",
    startTime: "",
    endTime: "",
    capacity: "",
    points: "",
};

export default function ManagerEventsPage() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [formValues, setFormValues] = useState(emptyEventForm);
    const [organizerUtorid, setOrganizerUtorid] = useState("");
    const [guestUtorid, setGuestUtorid] = useState("");
    const [awardUtorid, setAwardUtorid] = useState("");
    const [awardPoints, setAwardPoints] = useState("");
    const [editValues, setEditValues] = useState(null);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["manager-events", { page, search }],
        queryFn: () => {
            const params = new URLSearchParams();
            params.set("page", String(page));
            params.set("limit", String(PAGE_SIZE));
            params.set("showFull", "false");
            if (search.trim()) params.set("name", search.trim());
            return apiFetch(`/events?${params.toString()}`);
        },
        keepPreviousData: true,
    });

    const selectedEvent = useQuery({
        queryKey: ["manager-event-detail", selectedEventId],
        enabled: Number.isInteger(selectedEventId),
        queryFn: () => apiFetch(`/events/${selectedEventId}`),
    });

    const createEvent = useMutation({
        mutationFn: (payload) =>
            apiFetch("/events", {
                method: "POST",
                body: payload,
            }),
        onSuccess: () => {
            setFormValues(emptyEventForm);
            queryClient.invalidateQueries({ queryKey: ["manager-events"] });
        },
    });

    const updateEvent = useMutation({
        mutationFn: ({ id, payload }) =>
            apiFetch(`/events/${id}`, {
                method: "PATCH",
                body: payload,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["manager-events"] });
            queryClient.invalidateQueries({ queryKey: ["manager-event-detail", selectedEventId] });
        },
    });

    const deleteEvent = useMutation({
        mutationFn: (id) => apiFetch(`/events/${id}`, { method: "DELETE" }),
        onSuccess: () => {
            setSelectedEventId(null);
            queryClient.invalidateQueries({ queryKey: ["manager-events"] });
        },
    });

    const addOrganizer = useMutation({
        mutationFn: ({ id, utorid }) =>
            apiFetch(`/events/${id}/organizers`, {
                method: "POST",
                body: { utorid },
            }),
        onSuccess: () => {
            setOrganizerUtorid("");
            queryClient.invalidateQueries({ queryKey: ["manager-event-detail", selectedEventId] });
        },
    });

    const removeOrganizer = useMutation({
        mutationFn: ({ eventId, userId }) =>
            apiFetch(`/events/${eventId}/organizers/${userId}`, {
                method: "DELETE",
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["manager-event-detail", selectedEventId] });
        },
    });

    const addGuest = useMutation({
        mutationFn: ({ id, utorid }) =>
            apiFetch(`/events/${id}/guests`, {
                method: "POST",
                body: { utorid },
            }),
        onSuccess: () => {
            setGuestUtorid("");
            queryClient.invalidateQueries({ queryKey: ["manager-event-detail", selectedEventId] });
        },
    });

    const removeGuest = useMutation({
        mutationFn: ({ eventId, userId }) =>
            apiFetch(`/events/${eventId}/guests/${userId}`, {
                method: "DELETE",
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["manager-event-detail", selectedEventId] });
        },
    });

    const awardPointsMutation = useMutation({
        mutationFn: ({ eventId, utorid, amount }) =>
            apiFetch(`/events/${eventId}/transactions`, {
                method: "POST",
                body: { type: "event", utorid, amount },
            }),
        onSuccess: () => {
            setAwardUtorid("");
            setAwardPoints("");
            queryClient.invalidateQueries({ queryKey: ["manager-event-detail", selectedEventId] });
        },
    });

    const awardAllMutation = useMutation({
        mutationFn: ({ eventId, amount }) =>
            apiFetch(`/events/${eventId}/transactions`, {
                method: "POST",
                body: { type: "event", amount },
            }),
        onSuccess: () => {
            setAwardPoints("");
            queryClient.invalidateQueries({ queryKey: ["manager-event-detail", selectedEventId] });
        },
    });

    useEffect(() => {
        if (selectedEvent.data) {
            setEditValues({
                name: selectedEvent.data.name,
                description: selectedEvent.data.description ?? "",
                location: selectedEvent.data.location ?? "",
                startTime: selectedEvent.data.startTime?.slice(0, 16) ?? "",
                endTime: selectedEvent.data.endTime?.slice(0, 16) ?? "",
                capacity: selectedEvent.data.capacity ?? "",
            });
        } else {
            setEditValues(null);
        }
    }, [selectedEvent.data]);

    function handleListFilter(e) {
        e.preventDefault();
        setPage(1);
    }

    function handleCreate(e) {
        e.preventDefault();
        createEvent.mutate({
            name: formValues.name,
            description: formValues.description,
            location: formValues.location,
            startTime: formValues.startTime,
            endTime: formValues.endTime,
            capacity: formValues.capacity ? Number(formValues.capacity) : null,
            points: Number(formValues.points || 0),
        });
    }

    function handleUpdate(field, value) {
        if (!selectedEventId) return;
        updateEvent.mutate({
            id: selectedEventId,
            payload: { [field]: value },
        });
    }

    function handleEditSubmit(e) {
        e.preventDefault();
        if (!selectedEventId || !editValues) return;
        updateEvent.mutate({
            id: selectedEventId,
            payload: {
                name: editValues.name,
                description: editValues.description,
                location: editValues.location,
                startTime: editValues.startTime,
                endTime: editValues.endTime,
                capacity: editValues.capacity ? Number(editValues.capacity) : null,
            },
        });
    }

    const columns = [
        { header: "Name", render: (row) => row.name },
        { header: "Location", render: (row) => row.location },
        { header: "Start", render: (row) => formatDateTime(row.startTime) },
        { header: "End", render: (row) => formatDateTime(row.endTime) },
        {
            header: "Capacity",
            render: (row) =>
                row.capacity == null
                    ? `${row.numGuests} guests`
                    : `${row.numGuests}/${row.capacity}`,
        },
        {
            header: "Actions",
            render: (row) => (
                <div className="flex flex-wrap gap-2">
                    <button className="btn btn-ghost btn-xs" onClick={() => setSelectedEventId(row.id)}>
                        Details
                    </button>
                    {!row.published && (
                        <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => handleUpdate("published", true)}
                        >
                            Publish
                        </button>
                    )}
                    {!row.published && (
                        <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => deleteEvent.mutate(row.id)}
                        >
                            Delete
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <AppShell title="Manage events" subtitle="Create, publish, and administer loyalty events.">
            <Card title="Create new event">
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
                    <input
                        className="input input-bordered"
                        placeholder="Name"
                        value={formValues.name}
                        onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                        required
                    />
                    <input
                        className="input input-bordered"
                        placeholder="Location"
                        value={formValues.location}
                        onChange={(e) => setFormValues({ ...formValues, location: e.target.value })}
                        required
                    />
                    <input
                        className="input input-bordered md:col-span-2"
                        placeholder="Description"
                        value={formValues.description}
                        onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                    />
                    <input
                        type="datetime-local"
                        className="input input-bordered"
                        value={formValues.startTime}
                        onChange={(e) => setFormValues({ ...formValues, startTime: e.target.value })}
                        required
                    />
                    <input
                        type="datetime-local"
                        className="input input-bordered"
                        value={formValues.endTime}
                        onChange={(e) => setFormValues({ ...formValues, endTime: e.target.value })}
                        required
                    />
                    <input
                        className="input input-bordered"
                        type="number"
                        placeholder="Capacity (optional)"
                        value={formValues.capacity}
                        onChange={(e) => setFormValues({ ...formValues, capacity: e.target.value })}
                    />
                    <input
                        className="input input-bordered"
                        type="number"
                        placeholder="Total points"
                        value={formValues.points}
                        onChange={(e) => setFormValues({ ...formValues, points: e.target.value })}
                        required
                    />
                    <button
                        type="submit"
                        className="btn btn-primary md:col-span-2"
                        disabled={createEvent.isLoading}
                    >
                        {createEvent.isLoading ? "Creating…" : "Create event"}
                    </button>
                </form>
            </Card>

            <Card title="Events list">
                <FilterBar onSubmit={handleListFilter}>
                    <input
                        className="input input-bordered input-sm"
                        placeholder="Search by name"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button className="btn btn-primary btn-sm" type="submit">
                        Apply
                    </button>
                </FilterBar>
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <span className="loading loading-spinner text-primary" />
                    </div>
                ) : isError ? (
                    <p className="text-error">{error?.message}</p>
                ) : (
                    <DataTable columns={columns} data={data?.results ?? []} />
                )}
            </Card>

            {selectedEventId && (
                <Card title="Event details">
                    {selectedEvent.isLoading ? (
                        <div className="flex justify-center py-4">
                            <span className="loading loading-spinner text-primary" />
                        </div>
                    ) : selectedEvent.data ? (
                        <div className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <p className="text-xs text-neutral/60">Name</p>
                                    <p className="text-lg font-semibold">{selectedEvent.data.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral/60">Location</p>
                                    <p className="text-lg font-semibold">{selectedEvent.data.location}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral/60">Start</p>
                                    <p className="text-lg font-semibold">
                                        {formatDateTime(selectedEvent.data.startTime)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral/60">End</p>
                                    <p className="text-lg font-semibold">
                                        {formatDateTime(selectedEvent.data.endTime)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral/60">Capacity</p>
                                    <p className="text-lg font-semibold">
                                        {selectedEvent.data.capacity ?? "Unlimited"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral/60">Published</p>
                                    <p className="text-lg font-semibold">
                                        {selectedEvent.data.published ? "Yes" : "No"}
                                    </p>
                                </div>
                            </div>
                            {editValues && (
                                <form className="grid gap-3 md:grid-cols-2" onSubmit={handleEditSubmit}>
                                    <input
                                        className="input input-bordered"
                                        value={editValues.name}
                                        onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                                        placeholder="Name"
                                    />
                                    <input
                                        className="input input-bordered"
                                        value={editValues.location}
                                        onChange={(e) => setEditValues({ ...editValues, location: e.target.value })}
                                        placeholder="Location"
                                    />
                                    <textarea
                                        className="textarea textarea-bordered md:col-span-2"
                                        rows={3}
                                        value={editValues.description}
                                        onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                                        placeholder="Description"
                                    />
                                    <input
                                        type="datetime-local"
                                        className="input input-bordered"
                                        value={editValues.startTime}
                                        onChange={(e) => setEditValues({ ...editValues, startTime: e.target.value })}
                                    />
                                    <input
                                        type="datetime-local"
                                        className="input input-bordered"
                                        value={editValues.endTime}
                                        onChange={(e) => setEditValues({ ...editValues, endTime: e.target.value })}
                                    />
                                    <input
                                        className="input input-bordered"
                                        type="number"
                                        value={editValues.capacity}
                                        onChange={(e) => setEditValues({ ...editValues, capacity: e.target.value })}
                                        placeholder="Capacity"
                                    />
                                    <button type="submit" className="btn btn-primary md:col-span-2" disabled={updateEvent.isLoading}>
                                        {updateEvent.isLoading ? "Saving…" : "Update event"}
                                    </button>
                                </form>
                            )}
                            <div className="flex gap-3">
                                {!selectedEvent.data.published && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleUpdate("published", true)}
                                    >
                                        Publish event
                                    </button>
                                )}
                                {!selectedEvent.data.published && (
                                    <button
                                        className="btn btn-outline text-error"
                                        onClick={() => deleteEvent.mutate(selectedEventId)}
                                    >
                                        Delete event
                                    </button>
                                )}
                            </div>
                            <Card title="Organizers" className="border-0 bg-transparent shadow-none">
                                <ul className="space-y-2">
                                    {selectedEvent.data.organizers?.map((org) => (
                                        <li key={org.id} className="flex justify-between text-sm">
                                            <span>
                                                {org.name ?? org.utorid} ({org.utorid})
                                            </span>
                                            <button
                                                className="btn btn-ghost btn-xs text-error"
                                                onClick={() =>
                                                    removeOrganizer.mutate({
                                                        eventId: selectedEventId,
                                                        userId: org.id,
                                                    })
                                                }
                                            >
                                                Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <form
                                    className="mt-3 flex gap-2"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        addOrganizer.mutate({
                                            id: selectedEventId,
                                            utorid: organizerUtorid,
                                        });
                                    }}
                                >
                                    <input
                                        className="input input-bordered input-sm"
                                        value={organizerUtorid}
                                        onChange={(e) => setOrganizerUtorid(e.target.value)}
                                        placeholder="UTORid"
                                    />
                                    <button className="btn btn-primary btn-sm" type="submit">
                                        Add organizer
                                    </button>
                                </form>
                            </Card>

                            <Card title="Guests" className="border-0 bg-transparent shadow-none">
                                <form
                                    className="flex gap-2"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        addGuest.mutate({ id: selectedEventId, utorid: guestUtorid });
                                    }}
                                >
                                    <input
                                        className="input input-bordered input-sm"
                                        value={guestUtorid}
                                        onChange={(e) => setGuestUtorid(e.target.value)}
                                        placeholder="UTORid"
                                    />
                                    <button className="btn btn-primary btn-sm" type="submit">
                                        Add guest
                                    </button>
                                </form>
                                <p className="text-sm text-neutral/60 mt-2">
                                    Total guests: {selectedEvent.data.guests?.length ?? 0}
                                </p>
                            </Card>

                            <Card title="Award points" className="border-0 bg-transparent shadow-none">
                                <form
                                    className="grid gap-2 md:grid-cols-2"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        awardPointsMutation.mutate({
                                            eventId: selectedEventId,
                                            utorid: awardUtorid,
                                            amount: Number(awardPoints),
                                        });
                                    }}
                                >
                                    <input
                                        className="input input-bordered"
                                        placeholder="Guest UTORid (leave empty for all)"
                                        value={awardUtorid}
                                        onChange={(e) => setAwardUtorid(e.target.value)}
                                    />
                                    <input
                                        className="input input-bordered"
                                        type="number"
                                        placeholder="Points"
                                        value={awardPoints}
                                        onChange={(e) => setAwardPoints(e.target.value)}
                                        required
                                    />
                                    <button className="btn btn-primary md:col-span-2" type="submit">
                                        Award to single guest
                                    </button>
                                </form>
                                <button
                                    className="btn btn-outline btn-sm mt-3"
                                    onClick={() =>
                                        awardAllMutation.mutate({
                                            eventId: selectedEventId,
                                            amount: Number(awardPoints),
                                        })
                                    }
                                    disabled={!awardPoints}
                                >
                                    Award to all guests
                                </button>
                            </Card>
                        </div>
                    ) : (
                        <p>No event selected.</p>
                    )}
                </Card>
            )}
        </AppShell>
    );
}
