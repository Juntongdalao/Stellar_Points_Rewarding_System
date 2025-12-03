import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppShell } from "../components/layout";
import { Card, FilterBar } from "../components/ui";
import { QueryBoundary } from "../components/feedback";
import { cn } from "../lib/cn";
import { apiFetch } from "../lib/apiClient";

const PAGE_SIZE = 10;

const inputClass =
    "input input-bordered w-full rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-sm text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200";
const selectClass =
    "select select-bordered w-full rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-sm text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200";

export default function ManagerTransactionsPage() {
    const [page, setPage] = useState(1);
    const [searchName, setSearchName] = useState("");
    const [createdBy, setCreatedBy] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [suspiciousFilter, setSuspiciousFilter] = useState("");
    const [amountFilter, setAmountFilter] = useState("");
    const [amountOperator, setAmountOperator] = useState("gte");

    const txQuery = useQuery({
        queryKey: [
            "manager-transactions",
            {
                page,
                searchName,
                createdBy,
                typeFilter,
                suspiciousFilter,
                amountFilter,
                amountOperator,
            },
        ],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set("page", String(page));
            params.set("limit", String(PAGE_SIZE));
            if (searchName.trim()) params.set("name", searchName.trim());
            if (createdBy.trim()) params.set("createdBy", createdBy.trim());
            if (typeFilter) params.set("type", typeFilter);
            if (suspiciousFilter) params.set("suspicious", suspiciousFilter);
            if (amountFilter.trim()) {
                params.set("amount", amountFilter.trim());
                params.set("operator", amountOperator);
            }
            return apiFetch(`/transactions?${params.toString()}`);
        },
        keepPreviousData: true,
    });

    const { data, isLoading, isError, error, isFetching } = txQuery;
    const total = data?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const rows = data?.results ?? [];

    function handleApplyFilters(e) {
        e.preventDefault();
        setPage(1);
    }

    function handleResetFilters() {
        setSearchName("");
        setCreatedBy("");
        setTypeFilter("");
        setSuspiciousFilter("");
        setAmountFilter("");
        setAmountOperator("gte");
        setPage(1);
    }

    const emptyState = !isLoading && !isError && rows.length === 0;

    const columns = useMemo(
        () => [
            "ID",
            "User UTORid",
            "Type",
            "Spent",
            "Amount / Redeemed",
            "Suspicious",
            "Created By",
            "Remark",
            "Actions",
        ],
        [],
    );

    return (
        <AppShell
            title="Manager: All transactions"
            subtitle="Inspect every transaction, filter by role-specific needs, and drill into suspicious activity."
        >
            <Card title="Filters">
                <FilterBar onSubmit={handleApplyFilters} onReset={handleResetFilters}>
                    <div className="flex-1 min-w-[200px] space-y-2">
                        <label className="text-xs uppercase text-neutral/60 pl-1">
                            User (name or UTORid)
                        </label>
                        <input
                            className={inputClass}
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            placeholder="e.g., super123"
                        />
                    </div>
                    <div className="flex-1 min-w-[200px] space-y-2">
                        <label className="text-xs uppercase text-neutral/60 pl-1">
                            Created by (UTORid)
                        </label>
                        <input
                            className={inputClass}
                            value={createdBy}
                            onChange={(e) => setCreatedBy(e.target.value)}
                            placeholder="e.g., cashier1"
                        />
                    </div>
                    <div className="w-48 space-y-2">
                        <label className="text-xs uppercase text-neutral/60 pl-1">Type</label>
                        <select
                            className={selectClass}
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="purchase">Purchase</option>
                            <option value="transfer">Transfer</option>
                            <option value="redemption">Redemption</option>
                            <option value="adjustment">Adjustment</option>
                        </select>
                    </div>
                    <div className="w-48 space-y-2">
                        <label className="text-xs uppercase text-neutral/60 pl-1">Suspicious</label>
                        <select
                            className={selectClass}
                            value={suspiciousFilter}
                            onChange={(e) => setSuspiciousFilter(e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="true">Only suspicious</option>
                            <option value="false">Only non-suspicious</option>
                        </select>
                    </div>
                    <div className="w-full max-w-xs space-y-2">
                        <label className="text-xs uppercase text-neutral/60 pl-1">Amount filter</label>
                        <div className="flex gap-2">
                            <select
                                className={`${selectClass} w-24`}
                                value={amountOperator}
                                onChange={(e) => setAmountOperator(e.target.value)}
                            >
                                <option value="gte">≥</option>
                                <option value="lte">≤</option>
                            </select>
                            <input
                                className={`${inputClass} w-32`}
                                type="number"
                                value={amountFilter}
                                onChange={(e) => setAmountFilter(e.target.value)}
                                placeholder="points"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-primary btn-sm" type="submit">
                            Apply
                        </button>
                        <button className="btn btn-ghost btn-sm" type="reset">
                            Reset
                        </button>
                    </div>
                </FilterBar>
            </Card>

            <Card
                title="All transactions"
                actions={
                    isFetching ? <span className="text-sm text-neutral/60">Refreshing…</span> : undefined
                }
            >
                <QueryBoundary query={txQuery} loadingLabel="Loading transactions…">
                    <div className="mt-2 overflow-x-auto">
                        <table className="min-w-[800px] table">
                            <thead>
                                <tr className="text-xs uppercase tracking-wide text-neutral/60">
                                    {columns.map((header) => (
                                        <th key={header} className="border-b border-base-200 px-4 py-3">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {emptyState ? (
                                    <tr>
                                        <td
                                            colSpan={columns.length}
                                            className="py-10 text-center text-base-content/70"
                                        >
                                            No transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((tx) => {
                                        const displayAmount =
                                            tx.type === "redemption" && typeof tx.redeemed === "number"
                                                ? `Redeemed: ${tx.redeemed} (Change: ${tx.amount})`
                                                : tx.amount ?? "—";
                                        const spent =
                                            typeof tx.spent === "number"
                                                ? tx.spent.toFixed(2)
                                                : "—";
                                        return (
                                            <tr
                                                key={tx.id}
                                                className={cn(
                                                    "text-sm text-neutral",
                                                    rowBgForType(tx.type),
                                                    "border-b border-base-200/70"
                                                )}
                                            >
                                                <td className="px-4 py-3 font-mono text-xs">#{tx.id}</td>
                                                <td className="px-4 py-3 font-semibold text-base-content">
                                                    {tx.utorid}
                                                </td>
                                                <td className="px-4 py-3 capitalize">{tx.type}</td>
                                                <td className="px-4 py-3">{spent}</td>
                                                <td className="px-4 py-3">{displayAmount}</td>
                                                <td className="px-4 py-3">
                                                    {tx.suspicious ? (
                                                        <span className="badge badge-error badge-outline">Suspicious</span>
                                                    ) : (
                                                        <span className="badge badge-outline">Normal</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">{tx.createdBy ?? "—"}</td>
                                                <td className="px-4 py-3">{tx.remark?.trim() || "—"}</td>
                                                <td className="px-4 py-3">
                                                    <Link className="link" to={`/manager/transactions/${tx.id}`}>
                                                        View
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </QueryBoundary>

                {total > 0 && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-neutral/70">
                        <button
                            className="btn btn-outline btn-sm"
                            type="button"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </button>
                        <span>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            className="btn btn-outline btn-sm"
                            type="button"
                            onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                            disabled={page >= totalPages}
                        >
                            Next
                        </button>
                    </div>
                )}
            </Card>
        </AppShell>
    );
}

function rowBgForType(type) {
    switch (type) {
        case "purchase":
            return "bg-emerald-50/70";
        case "transfer":
            return "bg-sky-50/70";
        case "redemption":
            return "bg-amber-50/70";
        case "adjustment":
            return "bg-slate-50";
        default:
            return "bg-white";
    }
}
