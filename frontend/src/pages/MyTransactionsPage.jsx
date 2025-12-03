import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../components/layout";
import { Card, DataTable, FilterBar } from "../components/ui";
import { apiFetch } from "../lib/apiClient";

const PAGE_SIZE = 10;

const TYPE_OPTIONS = [
    { value: "", label: "All types" },
    { value: "purchase", label: "Purchase" },
    { value: "redemption", label: "Redemption" },
    { value: "adjustment", label: "Adjustment" },
    { value: "transfer", label: "Transfer" },
    { value: "event", label: "Event Award" },
];

function formatAmount(tx) {
    if (tx.type === "redemption") {
        return `-${tx.redeemed ?? Math.abs(tx.amount)} pts`;
    }
    return `${tx.amount >= 0 ? "+" : "-"}${Math.abs(tx.amount)} pts`;
}

export default function MyTransactionsPage() {
    const [page, setPage] = useState(1);
    const [type, setType] = useState("");
    const [amountOp, setAmountOp] = useState("");
    const [amount, setAmount] = useState("");
    const [orderBy, setOrderBy] = useState("desc");

    const { data, isLoading, isError, error, isFetching } = useQuery({
        queryKey: ["my-transactions", { page, type, amountOp, amount }],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set("page", String(page));
            params.set("limit", String(PAGE_SIZE));
            if (type) params.set("type", type);
            if (amountOp && amount !== "") {
                params.set("operator", amountOp);
                params.set("amount", String(amount));
            }
            return apiFetch(`/users/me/transactions?${params.toString()}`);
        },
        keepPreviousData: true,
    });

    const total = data?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const rawRows = data?.results ?? [];

    const rows = useMemo(() => {
        const sorted = [...rawRows];
        if (orderBy === "desc") {
            sorted.sort((a, b) => b.id - a.id);
        } else {
            sorted.sort((a, b) => a.id - b.id);
        }
        return sorted;
    }, [rawRows, orderBy]);

    function handleApplyFilters(event) {
        event.preventDefault();
        setPage(1);
    }

    const columns = [
        {
            header: "ID",
            render: (row) => <span className="font-mono text-sm">#{row.id}</span>,
        },
        {
            header: "Type",
            render: (row) => (
                <span className="badge badge-ghost capitalize">{row.type}</span>
            ),
        },
        {
            header: "Amount",
            render: (row) => <span className="font-semibold">{formatAmount(row)}</span>,
        },
        {
            header: "Details",
            render: (row) => (
                <div className="text-sm text-base-content/70 space-y-1">
                    {row.spent != null && <div>Spent ${row.spent.toFixed(2)}</div>}
                    {row.relatedId != null && <div>Related #{row.relatedId}</div>}
                    {row.promotionIds?.length > 0 && (
                        <div>Promos: {row.promotionIds.join(", ")}</div>
                    )}
                </div>
            ),
        },
        {
            header: "Created By",
            render: (row) => row.createdBy ?? "—",
        },
        {
            header: "Remark",
            render: (row) =>
                row.remark ? (
                    <span className="text-sm text-base-content/70">{row.remark}</span>
                ) : (
                    "—"
                ),
        },
    ];

    return (
        <AppShell
            title="My Transactions"
            subtitle="Review purchases, transfers, and redemptions with filters and ordering."
        >
            <Card>
                <FilterBar onSubmit={handleApplyFilters}>
                    <div className="form-control min-w-[160px]">
                        <label className="label">
                            <span className="label-text text-xs uppercase text-base-content/60">
                                Type
                            </span>
                        </label>
                        <select
                            className="select select-bordered select-sm"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            {TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text text-xs uppercase text-base-content/60">
                                Amount
                            </span>
                        </label>
                        <div className="flex gap-2">
                            <select
                                className="select select-bordered select-sm"
                                value={amountOp}
                                onChange={(e) => setAmountOp(e.target.value)}
                            >
                                <option value="">Any</option>
                                <option value="gte">≥</option>
                                <option value="lte">≤</option>
                            </select>
                            <input
                                className="input input-bordered input-sm"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="points"
                            />
                        </div>
                    </div>
                    <div className="form-control min-w-[160px]">
                        <label className="label">
                            <span className="label-text text-xs uppercase text-base-content/60">
                                Order
                            </span>
                        </label>
                        <select
                            className="select select-bordered select-sm"
                            value={orderBy}
                            onChange={(e) => setOrderBy(e.target.value)}
                        >
                            <option value="desc">Newest first</option>
                            <option value="asc">Oldest first</option>
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm">
                        Apply
                    </button>
                </FilterBar>
            </Card>

            <Card>
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <span className="loading loading-spinner text-primary" />
                    </div>
                ) : isError ? (
                    <p className="text-error">{error?.message}</p>
                ) : (
                    <DataTable
                        columns={columns}
                        data={rows}
                        emptyMessage="No transactions found."
                    />
                )}
            </Card>

            {total > 0 && (
                <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </button>
                    <span className="text-sm text-base-content/70">
                        Page {page} / {totalPages}{" "}
                        {isFetching && <span className="loading loading-dots loading-xs" />}
                    </span>
                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                        disabled={page >= totalPages}
                    >
                        Next
                    </button>
                </div>
            )}
        </AppShell>
    );
}
