import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../components/layout";
import { Card, DataTable } from "../components/ui";
import { QueryBoundary } from "../components/feedback";
import { apiFetch } from "../lib/apiClient";
import useAuthStore from "../store/authStore";

const TX_COLUMNS = [
    { header: "ID", render: (row) => <span className="font-mono text-sm">#{row.id}</span> },
    { header: "Customer", render: (row) => row.utorid || "—" },
    { header: "Type", render: (row) => <span className="badge badge-soft capitalize">{row.type}</span> },
    { header: "Amount", render: (row) => <span className="font-semibold">{row.amount >= 0 ? "+" : "-"}{Math.abs(row.amount)} pts</span> },
    { header: "Remark", render: (row) => row.remark || "—" },
];

export default function CashierDashboardPage() {
    const queryClient = useQueryClient();
    const me = useAuthStore((s) => s.user);
    const utorid = me?.utorid;

    const [txType, setTxType] = useState("purchase");
    const [customerUtorid, setCustomerUtorid] = useState("");
    const [spent, setSpent] = useState("");
    const [promoInput, setPromoInput] = useState("");
    const [adjustAmount, setAdjustAmount] = useState("");
    const [adjustRelated, setAdjustRelated] = useState("");
    const [remark, setRemark] = useState("");
    const [txMessage, setTxMessage] = useState("");
    const [txError, setTxError] = useState("");

    const [redemptionId, setRedemptionId] = useState("");
    const [redeemMessage, setRedeemMessage] = useState("");
    const [redeemError, setRedeemError] = useState("");

    const recentQuery = useQuery({
        queryKey: ["cashier-transactions", utorid],
        enabled: Boolean(utorid),
        queryFn: () => apiFetch(`/transactions?limit=5&page=1&createdBy=${utorid}`),
    });

    const createMutation = useMutation({
        mutationFn: (payload) =>
            apiFetch("/transactions", {
                method: "POST",
                body: payload,
            }),
        onSuccess: () => {
            setTxMessage("Transaction created.");
            setTxError("");
            setCustomerUtorid("");
            setSpent("");
            setPromoInput("");
            setAdjustAmount("");
            setAdjustRelated("");
            setRemark("");
            queryClient.invalidateQueries({ queryKey: ["cashier-transactions"] });
        },
        onError: (err) => {
            setTxMessage("");
            setTxError(err.message || "Failed to create transaction.");
        },
    });

    const processMutation = useMutation({
        mutationFn: (txId) =>
            apiFetch(`/transactions/${txId}/processed`, {
                method: "PATCH",
                body: { processed: true },
            }),
        onSuccess: () => {
            setRedeemMessage("Redemption processed.");
            setRedeemError("");
            setRedemptionId("");
            queryClient.invalidateQueries({ queryKey: ["cashier-transactions"] });
        },
        onError: (err) => {
            setRedeemMessage("");
            setRedeemError(err.message || "Failed to process redemption.");
        },
    });

    function parsePromoIds(raw) {
        if (!raw.trim()) return [];
        return raw
            .split(",")
            .map((id) => Number(id.trim()))
            .filter((id) => Number.isInteger(id));
    }

    function handleCreate(e) {
        e.preventDefault();
        setTxError("");
        setTxMessage("");

        if (!customerUtorid.trim()) {
            setTxError("Customer UTORid is required.");
            return;
        }

        if (txType === "purchase") {
            const spentValue = Number(spent);
            if (!Number.isFinite(spentValue) || spentValue <= 0) {
                setTxError("Spent amount must be a positive number.");
                return;
            }
            createMutation.mutate({
                utorid: customerUtorid.trim(),
                type: "purchase",
                spent: spentValue,
                remark: remark,
                promotionIds: parsePromoIds(promoInput),
            });
        } else {
            const amountValue = Number(adjustAmount);
            const relatedValue = Number(adjustRelated);
            if (!Number.isInteger(amountValue)) {
                setTxError("Adjustment amount must be an integer.");
                return;
            }
            if (!Number.isInteger(relatedValue) || relatedValue <= 0) {
                setTxError("Related transaction ID must be a positive integer.");
                return;
            }
            createMutation.mutate({
                utorid: customerUtorid.trim(),
                type: "adjustment",
                amount: amountValue,
                relatedId: relatedValue,
                remark: remark,
            });
        }
    }

    function handleProcess(e) {
        e.preventDefault();
        setRedeemError("");
        setRedeemMessage("");
        const idNumber = Number(redemptionId);
        if (!Number.isInteger(idNumber) || idNumber <= 0) {
            setRedeemError("Enter a valid redemption transaction ID.");
            return;
        }
        processMutation.mutate(idNumber);
    }

    const recentRows = useMemo(
        () =>
            (recentQuery.data?.results ?? [])
                .slice()
                .sort((a, b) => b.id - a.id),
        [recentQuery.data],
    );

    return (
        <AppShell
            title="Cashier workspace"
            subtitle="Record purchases, adjustments, and process pending redemptions."
        >
            <Card>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <p className="text-sm text-neutral/70">Signed in as</p>
                        <p className="text-xl font-semibold">{me?.utorid}</p>
                    </div>
                    <div>
                        <p className="text-sm text-neutral/70">Role</p>
                        <p className="text-xl font-semibold capitalize">{me?.role}</p>
                    </div>
                </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Create purchase or adjustment">
                    {txError && (
                        <div className="alert alert-error mb-4">
                            <span>{txError}</span>
                        </div>
                    )}
                    {txMessage && (
                        <div className="alert alert-success mb-4">
                            <span>{txMessage}</span>
                        </div>
                    )}
                    <form className="space-y-5" onSubmit={handleCreate}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral/70 pl-1">
                                Customer UTORid
                            </label>
                            <input
                                className="input input-bordered w-full rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                                value={customerUtorid}
                                onChange={(e) => setCustomerUtorid(e.target.value)}
                                placeholder="e.g., clive123"
                            />
                        </div>
                        <div className="flex gap-3">
                            <label className="label cursor-pointer gap-2">
                                <input
                                    type="radio"
                                    name="txType"
                                    className="radio radio-primary"
                                    value="purchase"
                                    checked={txType === "purchase"}
                                    onChange={(e) => setTxType(e.target.value)}
                                />
                                <span>Purchase</span>
                            </label>
                            <label className="label cursor-pointer gap-2">
                                <input
                                    type="radio"
                                    name="txType"
                                    className="radio radio-primary"
                                    value="adjustment"
                                    checked={txType === "adjustment"}
                                    onChange={(e) => setTxType(e.target.value)}
                                />
                                <span>Adjustment</span>
                            </label>
                        </div>
                        {txType === "purchase" ? (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-neutral/70 pl-1">
                                        Amount spent (CAD)
                                    </label>
                                    <input
                                        className="input input-bordered w-full rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={spent}
                                        onChange={(e) => setSpent(e.target.value)}
                                        placeholder="e.g., 24.99"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-neutral/70 pl-1">
                                        Promotion IDs (comma separated)
                                    </label>
                                    <input
                                        className="input input-bordered w-full rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                                        value={promoInput}
                                        onChange={(e) => setPromoInput(e.target.value)}
                                        placeholder="e.g., 1, 4, 5"
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-neutral/70 pl-1">
                                        Adjustment amount (points)
                                    </label>
                                    <input
                                        className="input input-bordered w-full rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                                        type="number"
                                        value={adjustAmount}
                                        onChange={(e) => setAdjustAmount(e.target.value)}
                                        placeholder="e.g., 100 or -50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-neutral/70 pl-1">
                                        Related transaction ID
                                    </label>
                                    <input
                                        className="input input-bordered w-full rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                                        type="number"
                                        value={adjustRelated}
                                        onChange={(e) => setAdjustRelated(e.target.value)}
                                        placeholder="Original transaction ID"
                                    />
                                </div>
                            </>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral/70 pl-1">
                                Remark (optional)
                            </label>
                            <textarea
                                className="textarea textarea-bordered w-full rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                                rows={3}
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={createMutation.isLoading}
                        >
                            {createMutation.isLoading ? "Submitting…" : "Create transaction"}
                        </button>
                    </form>
                </Card>

                <Card title="Process redemption">
                    {redeemError && (
                        <div className="alert alert-error mb-4">
                            <span>{redeemError}</span>
                        </div>
                    )}
                    {redeemMessage && (
                        <div className="alert alert-success mb-4">
                            <span>{redeemMessage}</span>
                        </div>
                    )}
                    <form className="space-y-5" onSubmit={handleProcess}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral/70 pl-1">
                                Redemption transaction ID
                            </label>
                            <input
                                className="input input-bordered w-full rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                                type="number"
                                value={redemptionId}
                                onChange={(e) => setRedemptionId(e.target.value)}
                                placeholder="Shown on customer's QR"
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={processMutation.isLoading}
                        >
                            {processMutation.isLoading ? "Processing…" : "Process redemption"}
                        </button>
                        <p className="text-xs text-neutral/60">
                            Tip: Ask the customer to show their redemption QR from "My Redemption QR"
                            page, or enter the transaction ID manually.
                        </p>
                    </form>
                </Card>
            </div>

            <Card title="Recent transactions you recorded">
                <QueryBoundary
                    query={recentQuery}
                    loadingLabel="Loading your recent transactions…"
                >
                    <DataTable
                        columns={TX_COLUMNS}
                        data={recentRows}
                        emptyMessage="No transactions yet."
                    />
                </QueryBoundary>
            </Card>
        </AppShell>
    );
}
