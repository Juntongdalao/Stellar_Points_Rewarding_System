import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../components/layout";
import { Card } from "../components/ui";
import { apiFetch } from "../lib/apiClient";

export default function UserTransferPage() {
    const queryClient = useQueryClient();
    const [recipientId, setRecipientId] = useState("");
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const { data: me, isLoading: meLoading } = useQuery({
        queryKey: ["me"],
        queryFn: () => apiFetch("/users/me"),
    });

    const transferMutation = useMutation({
        mutationFn: ({ userId, amount, note }) =>
            apiFetch(`/users/${userId}/transactions`, {
                method: "POST",
                body: { type: "transfer", amount, remark: note ?? "" },
            }),
        onSuccess: () => {
            setRecipientId("");
            setAmount("");
            setNote("");
            setFormError("");
            setSuccessMessage("Transfer created successfully.");
            queryClient.invalidateQueries({ queryKey: ["me"] });
            queryClient.invalidateQueries({ queryKey: ["my-transactions"] });
        },
        onError: (err) => {
            setSuccessMessage("");
            setFormError(err.message || "Failed to create transfer.");
        },
    });

    function handleSubmit(e) {
        e.preventDefault();
        setFormError("");
        setSuccessMessage("");

        const numericId = Number(recipientId.trim());
        const numericAmount = Number(amount);

        if (!Number.isInteger(numericId) || numericId <= 0) {
            setFormError("Recipient user ID must be a positive integer.");
            return;
        }
        if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
            setFormError("Amount must be a positive integer.");
            return;
        }

        transferMutation.mutate({
            userId: numericId,
            amount: numericAmount,
            note: note.trim(),
        });
    }

    return (
        <AppShell
            title="Transfer points"
            subtitle="Send loyalty points directly to another member."
        >
            <Card>
                {meLoading ? (
                    <div className="flex items-center gap-2">
                        <span className="loading loading-spinner text-primary" />
                        <span>Loading your balance…</span>
                    </div>
                ) : me ? (
                    <div className="text-base-content/70 text-sm">
                        Logged in as <strong>{me.utorid}</strong> ({me.role}). Current
                        balance:{" "}
                        <strong className="text-base-content">{me.points ?? 0}</strong> points.
                    </div>
                ) : null}
            </Card>

            <Card>
                {formError && (
                    <div className="alert alert-error mb-4">
                        <span>{formError}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="alert alert-success mb-4">
                        <span>{successMessage}</span>
                    </div>
                )}
                <form className="grid gap-5" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <label htmlFor="recipientId" className="text-sm font-medium text-neutral/70 pl-1">
                            Recipient user ID
                        </label>
                        <input
                            id="recipientId"
                            type="number"
                            min="1"
                            className="input input-bordered w-full rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            value={recipientId}
                            onChange={(e) => setRecipientId(e.target.value)}
                            placeholder="Numeric user ID (e.g., 3)"
                        />
                        <p className="text-xs text-base-content/60 pl-1">
                            Use the numeric internal ID shown to managers.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="amount" className="text-sm font-medium text-neutral/70 pl-1">
                            Amount of points
                        </label>
                        <input
                            id="amount"
                            type="number"
                            min="1"
                            className="input input-bordered w-full rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="e.g., 100"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="note" className="text-sm font-medium text-neutral/70 pl-1">
                            Note (optional)
                        </label>
                        <textarea
                            id="note"
                            className="textarea textarea-bordered w-full rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            rows={3}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Reason for transfer…"
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={transferMutation.isLoading}
                    >
                        {transferMutation.isLoading ? "Sending…" : "Send points"}
                    </button>
                </form>
            </Card>
        </AppShell>
    );
}
