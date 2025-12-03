import { useCallback, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../components/layout";
import { Card, DataTable } from "../components/ui";
import { apiFetch } from "../lib/apiClient";
import { formatDateTime } from "../lib/date";

export default function ManagerTransactionDetailPage() {
    const { transactionId } = useParams();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("details");
    const [adjustAmount, setAdjustAmount] = useState("");
    const [adjustRemark, setAdjustRemark] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const txQuery = useQuery({
        queryKey: ["manager-tx-detail", transactionId],
        queryFn: () => apiFetch(`/transactions/${transactionId}`),
    });

    const adjustmentsQuery = useQuery({
        queryKey: ["manager-tx-adjustments", transactionId],
        enabled: activeTab === "adjustments",
        queryFn: () =>
            apiFetch(`/transactions?type=adjustment&relatedId=${transactionId}&page=1&limit=20`),
    });

    const suspiciousMutation = useMutation({
        mutationFn: (newValue) =>
            apiFetch(`/transactions/${transactionId}/suspicious`, {
                method: "PATCH",
                body: { suspicious: newValue },
            }),
        onSuccess: (updated) => {
            queryClient.setQueryData(["manager-tx-detail", transactionId], updated);
            queryClient.invalidateQueries({ queryKey: ["manager-transactions"] });
            setMessage(updated.suspicious ? "Marked suspicious." : "Cleared suspicious flag.");
            setError("");
        },
        onError: (err) => {
            setError(err.message || "Failed to update suspicious flag.");
            setMessage("");
        },
    });

    const adjustmentMutation = useMutation({
        mutationFn: async () => {
            const tx = txQuery.data;
            if (!tx) throw new Error("Transaction not loaded yet.");
            const amount = Number(adjustAmount);
            if (!Number.isInteger(amount) || amount === 0) {
                throw new Error("Adjustment amount must be a non-zero integer.");
            }
            return apiFetch("/transactions", {
                method: "POST",
                body: {
                    utorid: tx.utorid,
                    type: "adjustment",
                    amount,
                    relatedId: tx.id,
                    remark: adjustRemark,
                },
            });
        },
        onSuccess: () => {
            setAdjustAmount("");
            setAdjustRemark("");
            setMessage("Created adjustment transaction.");
            setError("");
            queryClient.invalidateQueries({ queryKey: ["manager-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["manager-tx-adjustments", transactionId] });
        },
        onError: (err) => {
            setError(err.message || "Failed to create adjustment.");
            setMessage("");
        },
    });

    const handleToggle = useCallback(() => {
        if (txQuery.data) {
            suspiciousMutation.mutate(!txQuery.data.suspicious);
        }
    }, [txQuery.data, suspiciousMutation]);

    const handleAdjustmentSubmit = useCallback(
        (e) => {
            e.preventDefault();
            setError("");
            setMessage("");
            adjustmentMutation.mutate();
        },
        [adjustmentMutation],
    );

    if (txQuery.isLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <span className="loading loading-spinner text-primary" />
            </div>
        );
    }

    if (txQuery.isError) {
        return (
            <AppShell title="Transaction">
                <Card>
                    <p className="text-error">
                        Failed to load transaction: {txQuery.error?.message}
                    </p>
                    <Link className="btn btn-link px-0" to="/manager/transactions">
                        Back to transactions
                    </Link>
                </Card>
            </AppShell>
        );
    }

    const tx = txQuery.data;
    const promotionList = Array.isArray(tx.promotionIds)
        ? tx.promotionIds.join(", ")
        : "—";

    const adjustmentRows = useMemo(
        () => adjustmentsQuery.data?.results ?? [],
        [adjustmentsQuery.data],
    );

    const adjustmentColumns = [
        { header: "ID", render: (row) => <span className="font-mono">#{row.id}</span> },
        { header: "Amount", render: (row) => `${row.amount >= 0 ? "+" : "-"}${Math.abs(row.amount)}` },
        { header: "Remark", render: (row) => row.remark || "—" },
    ];

    return (
        <AppShell title={`Transaction #${tx.id}`} subtitle="Manager review">
            <Card>
                <Link className="btn btn-link px-0" to="/manager/transactions">
                    ← Back to all transactions
                </Link>
            </Card>
            {(message || error) && (
                <Card>
                    {message && <div className="alert alert-success">{message}</div>}
                    {error && <div className="alert alert-error">{error}</div>}
                </Card>
            )}
            <Card>
                <div role="tablist" className="tabs tabs-bordered">
                    <button
                        role="tab"
                        className={`tab ${activeTab === "details" ? "tab-active" : ""}`}
                        onClick={() => setActiveTab("details")}
                    >
                        Details
                    </button>
                    <button
                        role="tab"
                        className={`tab ${activeTab === "adjustments" ? "tab-active" : ""}`}
                        onClick={() => setActiveTab("adjustments")}
                    >
                        Adjustments
                    </button>
                </div>
                {activeTab === "details" ? (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                            <p className="text-xs text-neutral/60">User</p>
                            <p className="text-lg font-semibold">{tx.utorid}</p>
                        </div>
                        <div>
                            <p className="text-xs text-neutral/60">Type</p>
                            <p className="text-lg font-semibold capitalize">{tx.type}</p>
                        </div>
                        <div>
                            <p className="text-xs text-neutral/60">Amount</p>
                            <p className="text-lg font-semibold">{tx.amount}</p>
                        </div>
                        <div>
                            <p className="text-xs text-neutral/60">Spent</p>
                            <p className="text-lg font-semibold">{tx.spent ?? "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-neutral/60">Redeemed</p>
                            <p className="text-lg font-semibold">{tx.redeemed ?? "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-neutral/60">Related ID</p>
                            <p className="text-lg font-semibold">{tx.relatedId ?? "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-neutral/60">Created By</p>
                            <p className="text-lg font-semibold">{tx.createdBy ?? "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-neutral/60">Processed By</p>
                            <p className="text-lg font-semibold">{tx.processedBy ?? "—"}</p>
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-xs text-neutral/60">Promotions</p>
                            <p className="text-lg font-semibold">{promotionList}</p>
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-xs text-neutral/60">Remark</p>
                            <p className="text-base">{tx.remark || "—"}</p>
                        </div>
                        <div className="md:col-span-2 flex gap-3">
                            <button
                                className={`btn ${tx.suspicious ? "btn-error" : "btn-outline"}`}
                                onClick={handleToggle}
                                disabled={suspiciousMutation.isLoading}
                            >
                                {tx.suspicious ? "Mark as not suspicious" : "Mark as suspicious"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mt-4 space-y-4">
                        <DataTable columns={adjustmentColumns} data={adjustmentRows} />
                        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleAdjustmentSubmit}>
                            <input
                                className="input input-bordered"
                                type="number"
                                placeholder="Adjustment amount"
                                value={adjustAmount}
                                onChange={(e) => setAdjustAmount(e.target.value)}
                            />
                            <input
                                className="input input-bordered"
                                placeholder="Remark (optional)"
                                value={adjustRemark}
                                onChange={(e) => setAdjustRemark(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="btn btn-primary md:col-span-2"
                                disabled={adjustmentMutation.isLoading}
                            >
                                {adjustmentMutation.isLoading ? "Creating…" : "Create adjustment"}
                            </button>
                        </form>
                    </div>
                )}
            </Card>
        </AppShell>
    );
}
