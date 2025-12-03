import { useLocation, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import QRCode from "react-qr-code";
import { AppShell } from "../components/layout";
import { Card } from "../components/ui";
import { apiFetch } from "../lib/apiClient";

export default function UserRedemptionQrPage() {
    const { transactionId } = useParams();
    const location = useLocation();
    const txIdNum = Number(transactionId);

    const { data: tx, isLoading, isError } = useQuery({
        queryKey: ["redemption-detail", txIdNum],
        enabled: Number.isInteger(txIdNum),
        queryFn: async () => {
            const response = await apiFetch(
                "/users/me/transactions?page=1&limit=50&type=redemption",
            );
            return response.results?.find((row) => row.id === txIdNum) ?? null;
        },
    });

    const fallbackAmount = location.state?.amount ?? null;
    const fallbackRemark = location.state?.remark ?? "";

    const qrPayload = JSON.stringify({
        kind: "redemption",
        transactionId: txIdNum,
    });

    return (
        <AppShell
            title="Redemption QR code"
            subtitle="Show this to a cashier so they can locate your pending request."
        >
            {isError && (
                <Card>
                    <p className="text-error">
                        Unable to load redemption details. The QR code is still valid.
                    </p>
                </Card>
            )}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-base-content/60">Transaction ID</dt>
                            <dd className="font-semibold">#{txIdNum}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-base-content/60">Requested points</dt>
                            <dd className="font-semibold">
                                {tx?.redeemed ?? fallbackAmount ?? "—"}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-base-content/60">Note</dt>
                            <dd className="text-base-content/80">
                                {tx?.remark || fallbackRemark || "None"}
                            </dd>
                        </div>
                        <div className="text-xs text-base-content/60">
                            Cashiers only need the transaction ID embedded in the QR code, even if
                            details are missing.
                        </div>
                    </dl>
                </Card>
                <Card className="flex flex-col items-center gap-4">
                    <div className="rounded-3xl bg-base-200 p-6 shadow-inner">
                        <QRCode value={qrPayload} size={200} style={{ width: "12rem" }} />
                    </div>
                    {isLoading && (
                        <span className="loading loading-dots text-primary"></span>
                    )}
                    <p className="text-xs text-base-content/60 break-all">
                        Payload: <code>{qrPayload}</code>
                    </p>
                </Card>
            </div>
            <div className="flex flex-wrap gap-4">
                <Link to="/me/points" className="btn btn-link btn-sm px-0">
                    Back to My Points
                </Link>
                <Link to="/me/transactions" className="btn btn-link btn-sm px-0">
                    View transactions
                </Link>
            </div>
        </AppShell>
    );
}
