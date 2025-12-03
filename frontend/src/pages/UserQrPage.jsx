import { useQuery } from "@tanstack/react-query";
import QRCode from "react-qr-code";
import { AppShell } from "../components/layout";
import { Card } from "../components/ui";
import { apiFetch } from "../lib/apiClient";

export default function UserQrPage() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["me-qr"],
        queryFn: () => apiFetch("/users/me"),
    });

    if (isLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <span className="loading loading-spinner loading-lg text-primary" />
            </div>
        );
    }

    if (isError) {
        return (
            <AppShell title="My QR code">
                <Card>
                    <p className="text-error">
                        Failed to load QR data: {error?.message}
                    </p>
                </Card>
            </AppShell>
        );
    }

    const me = data;
    const qrPayload = JSON.stringify({
        id: me.id,
        utorid: me.utorid,
    });

    return (
        <AppShell title="My QR code" subtitle="Cashiers scan this to identify you quickly.">
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-base-content/60">UTORid</dt>
                            <dd className="font-semibold">{me.utorid}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-base-content/60">User ID</dt>
                            <dd className="font-semibold">{me.id}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-base-content/60">Role</dt>
                            <dd className="font-semibold capitalize">{me.role}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-base-content/60">Points</dt>
                            <dd className="font-semibold">{me.points ?? 0}</dd>
                        </div>
                    </dl>
                </Card>
                <Card className="flex flex-col items-center gap-4">
                    <div className="rounded-3xl bg-base-200 p-6 shadow-inner">
                        <QRCode
                            value={qrPayload}
                            size={192}
                            style={{ height: "auto", width: "12rem" }}
                        />
                    </div>
                    <p className="text-sm text-base-content/70 text-center">
                        Encoded payload:
                        <code className="ml-2 rounded bg-base-200 px-2 py-1 text-xs">{qrPayload}</code>
                    </p>
                </Card>
            </div>
        </AppShell>
    );
}
