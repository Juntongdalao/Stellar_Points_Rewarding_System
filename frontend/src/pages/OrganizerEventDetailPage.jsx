import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../components/layout";
import { Card } from "../components/ui";
import { apiFetch } from "../lib/apiClient";
import { formatDateTime } from "../lib/date";

export default function OrganizerEventDetailPage() {
    const { eventId } = useParams();
    const queryClient = useQueryClient();
    const numericId = Number(eventId);
    const [newGuestUtorid, setNewGuestUtorid] = useState("");
    const [awardGuestUtorid, setAwardGuestUtorid] = useState("");
    const [note, setNote] = useState("");
    const [awardPoints, setAwardPoints] = useState("");
    const [awardMode, setAwardMode] = useState("single");
    const [editValues, setEditValues] = useState({ location: "", description: "" });

    const { data: event, isLoading, isError, error } = useQuery({
        queryKey: ["organizer-event", numericId],
        enabled: Number.isInteger(numericId),
        queryFn: () => apiFetch(`/events/${numericId}`),
    });

    const addGuestMutation = useMutation({
        mutationFn: ({ utorid }) =>
            apiFetch(`/events/${numericId}/guests`, {
                method: "POST",
                body: { utorid },
            }),
        onSuccess: () => {
            setNewGuestUtorid("");
            queryClient.invalidateQueries({ queryKey: ["organizer-event", numericId] });
        },
    });

    const removeGuestMutation = useMutation({
        mutationFn: (userId) =>
            apiFetch(`/events/${numericId}/guests/${userId}`, {
                method: "DELETE",
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organizer-event", numericId] });
        },
    });

    useEffect(() => {
        if (event) {
            setEditValues({
                location: event.location ?? "",
                description: event.description ?? "",
            });
        }
    }, [event]);

    const updateMutation = useMutation({
        mutationFn: (payload) =>
            apiFetch(`/events/${numericId}`, {
                method: "PATCH",
                body: payload,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organizer-event", numericId] });
        },
    });

    const awardMutation = useMutation({
        mutationFn: (payload) =>
            apiFetch(`/events/${numericId}/transactions`, {
                method: "POST",
                body: payload,
            }),
        onSuccess: () => {
            setNote("");
            setAwardPoints("");
            setAwardGuestUtorid("");
            queryClient.invalidateQueries({ queryKey: ["organizer-event", numericId] });
        },
    });

    const shareLink = useMemo(() => {
        if (typeof window === "undefined") return "";
        return `${window.location.origin}/events/${numericId}`;
    }, [numericId]);

    const copyShareLink = useCallback(() => {
        if (navigator?.clipboard && shareLink) {
            navigator.clipboard.writeText(shareLink);
        }
    }, [shareLink]);

    function handleAwardSubmit(e) {
        e.preventDefault();
        const amount = Number(awardPoints);
        if (!Number.isFinite(amount) || amount <= 0) return;
        const payload = {
            type: "event",
            amount,
            remark: note,
        };
        if (awardMode === "single") {
            payload.utorid = awardGuestUtorid.trim();
        }
        awardMutation.mutate(payload);
    }

    if (isLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <span className="loading loading-spinner text-primary" />
            </div>
        );
    }

    if (isError || !event) {
        return (
            <AppShell title="Event">
                <Card>
                    <p className="text-error">{error?.message || "Unable to load event."}</p>
                </Card>
            </AppShell>
        );
    }

    return (
        <AppShell title={event.name} subtitle={event.location}>
            <Card>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <p className="text-xs text-neutral/60">Start</p>
                        <p className="text-lg font-semibold">{formatDateTime(event.startTime)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral/60">End</p>
                        <p className="text-lg font-semibold">{formatDateTime(event.endTime)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral/60">Capacity</p>
                        <p className="text-lg font-semibold">
                            {event.capacity ?? "Unlimited"} ({event.numGuests} guests)
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral/60">Points remaining</p>
                        <p className="text-lg font-semibold">{event.pointsRemain ?? "—"}</p>
                    </div>
                </div>
                <p className="mt-4 text-neutral/70">{event.description}</p>
            </Card>

            <Card title="Edit basics">
                <form
                    className="grid gap-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        updateMutation.mutate(editValues);
                    }}
                >
                    <div className="form-control">
                        <label className="label text-sm">Location</label>
                        <input
                            className="input input-bordered"
                            value={editValues.location}
                            onChange={(e) => setEditValues({ ...editValues, location: e.target.value })}
                        />
                    </div>
                    <div className="form-control">
                        <label className="label text-sm">Description</label>
                        <textarea
                            className="textarea textarea-bordered"
                            rows={3}
                            value={editValues.description}
                            onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                        />
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={updateMutation.isLoading}>
                        {updateMutation.isLoading ? "Saving…" : "Save changes"}
                    </button>
                </form>
            </Card>

            <Card title="Share event">
                <div className="flex flex-col items-center gap-3">
                    <div className="rounded-2xl bg-base-200 p-4">
                        <QRCode value={shareLink || String(numericId)} size={128} />
                    </div>
                    <p className="text-sm text-neutral/70">Event link: {shareLink}</p>
                    <button className="btn btn-ghost btn-sm" onClick={copyShareLink}>
                        Copy link
                    </button>
                </div>
            </Card>

            <Card title="Guest list">
                {event.guests?.length ? (
                    <ul className="space-y-2">
                        {event.guests.map((guest) => (
                            <li key={guest.id} className="flex items-center justify-between rounded-xl bg-base-200/60 px-3 py-2">
                                <span className="text-sm font-medium text-neutral">
                                    {guest.name ?? guest.utorid} ({guest.utorid})
                                </span>
                                <button
                                    className="btn btn-ghost btn-xs text-error"
                                    type="button"
                                    onClick={() => removeGuestMutation.mutate(guest.id)}
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-neutral/70">No guests yet — invite users below.</p>
                )}
                <form
                    className="mt-4 flex gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        addGuestMutation.mutate({ utorid: newGuestUtorid });
                    }}
                >
                    <input
                        className="input input-bordered"
                        placeholder="Add guest by UTORid"
                        value={newGuestUtorid}
                        onChange={(e) => setNewGuestUtorid(e.target.value)}
                        required
                    />
                    <button className="btn btn-primary" type="submit" disabled={addGuestMutation.isLoading}>
                        {addGuestMutation.isLoading ? "Adding…" : "Add guest"}
                    </button>
                </form>
            </Card>

            <Card title="Award points">
                <div className="mb-4 flex gap-2 rounded-2xl bg-base-200/60 p-1">
                    <button
                        type="button"
                        className={`btn btn-sm flex-1 ${awardMode === "single" ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => setAwardMode("single")}
                        data-cy="award-mode-single"
                    >
                        Single guest
                    </button>
                    <button
                        type="button"
                        className={`btn btn-sm flex-1 ${awardMode === "all" ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => setAwardMode("all")}
                        data-cy="award-mode-all"
                    >
                        All guests
                    </button>
                </div>
                <form className="grid gap-3 md:grid-cols-2" onSubmit={handleAwardSubmit}>
                    {awardMode === "single" ? (
                        <div className="md:col-span-2">
                            <label className="label text-xs uppercase tracking-wide text-neutral/60">
                                Recipient UTORid
                            </label>
                            <input
                                className="input input-bordered"
                                placeholder="Guest UTORid"
                                value={awardGuestUtorid}
                                onChange={(e) => setAwardGuestUtorid(e.target.value)}
                                required={awardMode === "single"}
                                data-cy="award-recipient-input"
                            />
                        </div>
                    ) : (
                        <div className="md:col-span-2 rounded-2xl bg-base-200/70 px-4 py-3 text-sm text-neutral/70">
                            {event.guests?.length
                                ? `Each of the ${event.guests.length} guests will receive the amount below.`
                                : "No guests have RSVPed yet, so there is no one to award."}
                        </div>
                    )}
                    <div>
                        <label className="label text-xs uppercase tracking-wide text-neutral/60">Points</label>
                        <input
                            className="input input-bordered"
                            type="number"
                            min="1"
                            placeholder="Points"
                            value={awardPoints}
                            onChange={(e) => setAwardPoints(e.target.value)}
                            required
                            data-cy="award-points-input"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="label text-xs uppercase tracking-wide text-neutral/60">
                            Note (optional)
                        </label>
                        <textarea
                            className="textarea textarea-bordered w-full"
                            rows={3}
                            placeholder="Add more context"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            data-cy="award-note"
                        />
                    </div>
                    <button
                        className="btn btn-primary md:col-span-2"
                        type="submit"
                        disabled={
                            awardMutation.isLoading ||
                            !awardPoints ||
                            (awardMode === "single" && !awardGuestUtorid.trim()) ||
                            (awardMode === "all" && (!event.guests || event.guests.length === 0))
                        }
                        data-cy="award-submit"
                    >
                        {awardMutation.isLoading
                            ? "Sending…"
                            : awardMode === "single"
                              ? "Award points"
                              : "Award everyone"}
                    </button>
                </form>
            </Card>
        </AppShell>
    );
}
