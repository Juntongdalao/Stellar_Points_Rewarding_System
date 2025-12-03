import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/layout";
import { Card } from "../components/ui";
import { apiFetch } from "../lib/apiClient";
import { formatDateTime } from "../lib/date";

export default function EventDetailPage() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const numericId = Number(eventId);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["event", numericId],
        enabled: Number.isInteger(numericId),
        queryFn: () => apiFetch(`/events/${numericId}`),
    });

    const joinMutation = useMutation({
        mutationFn: () => apiFetch(`/events/${numericId}/guests/me`, { method: "POST", body: {} }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["event", numericId] });
            queryClient.invalidateQueries({ queryKey: ["events"] });
        },
    });

    const leaveMutation = useMutation({
        mutationFn: () => apiFetch(`/events/${numericId}/guests/me`, { method: "DELETE" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["event", numericId] });
            queryClient.invalidateQueries({ queryKey: ["events"] });
        },
    });

    if (!Number.isInteger(numericId)) {
        return (
            <AppShell title="Event">
                <Card>Invalid event ID.</Card>
            </AppShell>
        );
    }

    if (isLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <span className="loading loading-spinner loading-lg text-primary" />
            </div>
        );
    }

    if (isError) {
        return (
            <AppShell title="Event">
                <Card>Error loading event: {error?.message}</Card>
            </AppShell>
        );
    }

    const event = data;
    const capacityText =
        event.capacity != null
            ? `${event.guests?.length ?? event.numGuests ?? 0}/${event.capacity}`
            : `${event.guests?.length ?? event.numGuests ?? 0} guests`;

    return (
        <AppShell title={event.name} subtitle={event.location}>
            <Card>
                <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <dt className="text-xs uppercase text-base-content/60">Starts</dt>
                        <dd className="font-semibold">{formatDateTime(event.startTime)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase text-base-content/60">Ends</dt>
                        <dd className="font-semibold">{formatDateTime(event.endTime)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase text-base-content/60">Capacity</dt>
                        <dd className="font-semibold">{capacityText}</dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase text-base-content/60">Status</dt>
                        <dd className="font-semibold">
                            {event.published ? "Published" : "Draft"}
                        </dd>
                    </div>
                </dl>
                <p className="mt-4 text-base-content/80">{event.description}</p>
            </Card>

            <Card title="Organizers">
                {event.organizers?.length ? (
                    <ul className="list-disc pl-6">
                        {event.organizers.map((org) => (
                            <li key={org.id}>
                                {org.name ?? org.utorid} ({org.utorid})
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-base-content/70">No organizers listed.</p>
                )}
            </Card>

            <div className="flex flex-wrap gap-3">
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => joinMutation.mutate()}
                    disabled={joinMutation.isLoading}
                >
                    {joinMutation.isLoading ? "Joining…" : "Join event"}
                </button>
                <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => leaveMutation.mutate()}
                    disabled={leaveMutation.isLoading}
                >
                    {leaveMutation.isLoading ? "Leaving…" : "Cancel RSVP"}
                </button>
                <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => navigate(-1)}
                >
                    Back
                </button>
            </div>
        </AppShell>
    );
}
