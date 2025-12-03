import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/layout";
import { Card } from "../components/ui";
import { apiFetch } from "../lib/apiClient";

export default function UserRedeemPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [amount, setAmount] = useState("");
    const [remark, setRemark] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const { data: me } = useQuery({
        queryKey: ["me"],
        queryFn: () => apiFetch("/users/me"),
    });

    const redeemMutation = useMutation({
        mutationFn: ({ amount, remark }) =>
            apiFetch("/users/me/transactions", {
                method: "POST",
                body: { type: "redemption", amount, remark },
            }),
        onSuccess: (tx) => {
            setError("");
            setMessage("Redemption request created successfully.");
            queryClient.invalidateQueries({ queryKey: ["me"] });
            queryClient.invalidateQueries({ queryKey: ["my-transactions"] });
            navigate(`/me/redemptions/${tx.id}`, {
                state: { amount: tx.amount, remark: tx.remark ?? "" },
            });
        },
        onError: (err) => {
            setMessage("");
            setError(err.message || "Failed to create redemption request.");
        },
    });

    function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setMessage("");

        const pts = Number(amount);
        if (!Number.isInteger(pts) || pts <= 0) {
            setError("Amount must be a positive integer.");
            return;
        }

        redeemMutation.mutate({
            amount: pts,
            remark: remark.trim(),
        });
    }

    return (
        <AppShell title="Redeem points" subtitle="Submit a redemption request for cashier approval.">
            <Card>
                {me && (
                    <p className="text-sm text-base-content/70">
                        Logged in as <strong>{me.utorid}</strong> · Current points:{" "}
                        <strong className="text-base-content">{me.points ?? 0}</strong>
                    </p>
                )}
            </Card>

            <Card>
                <p className="text-sm text-base-content/70 mb-4">
                    A cashier will verify the request using the QR code generated after submission.
                    Ensure you have sufficient points and are verified.
                </p>
                {error && (
                    <div className="alert alert-error mb-4">
                        <span>{error}</span>
                    </div>
                )}
                {message && (
                    <div className="alert alert-success mb-4">
                        <span>{message}</span>
                    </div>
                )}
                <form className="grid gap-5" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <label htmlFor="amount" className="text-sm font-medium text-neutral/70 pl-1">
                            Points to redeem
                        </label>
                        <input
                            id="amount"
                            type="number"
                            min={1}
                            className="input input-bordered w-full rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="e.g., 500"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="remark" className="text-sm font-medium text-neutral/70 pl-1">
                            Note (optional)
                        </label>
                        <textarea
                            id="remark"
                            rows={3}
                            className="textarea textarea-bordered w-full rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            placeholder="Optional note for the cashier..."
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={redeemMutation.isLoading}
                    >
                        {redeemMutation.isLoading ? "Submitting…" : "Submit redemption request"}
                    </button>
                </form>
            </Card>
        </AppShell>
    );
}
