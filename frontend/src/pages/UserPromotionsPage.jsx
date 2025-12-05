import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../components/layout";
import { Card, FilterBar } from "../components/ui";
import { QueryBoundary } from "../components/feedback";
import { apiFetch } from "../lib/apiClient";
import { formatDateTime } from "../lib/date";

const PAGE_SIZE = 9;

export default function UserPromotionsPage() {
    const [typeFilter, setTypeFilter] = useState("");
    const [page, setPage] = useState(1);

    const promosQuery = useQuery({
        queryKey: ["promotions", typeFilter, page],
        queryFn: () => {
            const params = new URLSearchParams();
            params.set("page", String(page));
            params.set("limit", String(PAGE_SIZE));
            if (typeFilter) params.set("type", typeFilter);
            return apiFetch(`/promotions?${params.toString()}`);
        },
        keepPreviousData: true,
    });
    const { data, isLoading, isError, error } = promosQuery;

    const total = data?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const promotions = data?.results ?? [];

    function handleApply(e) {
        e.preventDefault();
        setPage(1);
    }

    return (
        <AppShell
            title="Available promotions"
            subtitle="Active automatic and one-time offers you can apply during purchases."
        >
            <Card>
                <FilterBar onSubmit={handleApply}>
                    <div className="form-control min-w-[160px]">
                        <label className="label">
                            <span className="label-text text-xs uppercase text-base-content/60">
                                Promotion type
                            </span>
                        </label>
                        <select
                            className="select select-bordered select-sm"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="automatic">Automatic</option>
                            <option value="onetime">One-time</option>
                        </select>
                    </div>
                    <button className="btn btn-primary btn-sm" type="submit">
                        Apply
                    </button>
                </FilterBar>
            </Card>

            <Card>
                <QueryBoundary query={promosQuery} loadingLabel="Loading promotions…">
                    {promotions.length === 0 ? (
                        <p className="text-base-content/70">No promotions available right now.</p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {promotions.map((promo) => (
                                <article
                                    key={promo.id}
                                    className="rounded-2xl border border-base-200 bg-base-100 p-5 shadow-card"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-lg font-semibold">{promo.name}</h2>
                                            <div className="mt-2 inline-block rounded border-2 border-brand-300 bg-brand-50 px-2 py-1">
                                                <span className="text-xs font-bold text-brand-700 font-mono">ID: #{promo.id}</span>
                                            </div>
                                        </div>
                                        <span className="badge badge-soft capitalize">{promo.type}</span>
                                    </div>
                                    <p className="mt-2 text-sm text-base-content/70">
                                        Ends {formatDateTime(promo.endTime)}
                                    </p>
                                    <dl className="mt-4 space-y-2 text-sm">
                                        {promo.points != null && (
                                            <div className="flex justify-between">
                                                <dt className="text-base-content/70">Bonus points</dt>
                                                <dd className="font-semibold">{promo.points}</dd>
                                            </div>
                                        )}
                                        {promo.rate != null && (
                                            <div className="flex justify-between">
                                                <dt className="text-base-content/70">Rate bonus</dt>
                                                <dd className="font-semibold">{promo.rate}</dd>
                                            </div>
                                        )}
                                        {promo.minSpending != null && (
                                            <div className="flex justify-between">
                                                <dt className="text-base-content/70">Min spending</dt>
                                                <dd className="font-semibold">${promo.minSpending}</dd>
                                            </div>
                                        )}
                                    </dl>
                                </article>
                            ))}
                        </div>
                    )}
                </QueryBoundary>
            </Card>

            {total > PAGE_SIZE && (
                <div className="flex items-center justify-between">
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </button>
                    <span className="text-sm text-base-content/70">
                        Page {page} of {totalPages}
                    </span>
                    <button
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
