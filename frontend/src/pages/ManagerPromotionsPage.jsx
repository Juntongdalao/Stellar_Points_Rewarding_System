import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../components/layout";
import { Card, DataTable, FilterBar } from "../components/ui";
import { QueryBoundary } from "../components/feedback";
import { apiFetch } from "../lib/apiClient";
import { formatDateTime } from "../lib/date";

const PAGE_SIZE = 10;

const initialForm = {
    id: null,
    name: "",
    description: "",
    type: "automatic",
    startTime: "",
    endTime: "",
    minSpending: "",
    rate: "",
    points: "",
};

export default function ManagerPromotionsPage() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [orderBy, setOrderBy] = useState("name");
    const [formState, setFormState] = useState(initialForm);

    const promotionsQuery = useQuery({
        queryKey: ["manager-promotions", { page, search, typeFilter, orderBy }],
        queryFn: () => {
            const params = new URLSearchParams();
            params.set("page", String(page));
            params.set("limit", String(PAGE_SIZE));
            if (search.trim()) params.set("name", search.trim());
            if (typeFilter) params.set("type", typeFilter);
            params.set("orderBy", orderBy);
            return apiFetch(`/promotions?${params.toString()}`);
        },
    });
    const { data, isLoading, isError, error } = promotionsQuery;

    const createMutation = useMutation({
        mutationFn: (payload) =>
            apiFetch("/promotions", {
                method: "POST",
                body: payload,
            }),
        onSuccess: () => {
            setFormState(initialForm);
            queryClient.invalidateQueries({ queryKey: ["manager-promotions"] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }) =>
            apiFetch(`/promotions/${id}`, {
                method: "PATCH",
                body: payload,
            }),
        onSuccess: () => {
            setFormState(initialForm);
            queryClient.invalidateQueries({ queryKey: ["manager-promotions"] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) =>
            apiFetch(`/promotions/${id}`, {
                method: "DELETE",
            }),
        onSuccess: () => {
            setFormState(initialForm);
            queryClient.invalidateQueries({ queryKey: ["manager-promotions"] });
        },
    });

    function handleFilterSubmit(e) {
        e.preventDefault();
        setPage(1);
    }

    function handleOrderByChange(field) {
        setOrderBy(field);
        setPage(1);
        queryClient.invalidateQueries({ queryKey: ["manager-promotions"] });
    }

    function handleEdit(promo) {
        setFormState({
            id: promo.id,
            name: promo.name,
            description: promo.description || "",
            type: promo.type,
            startTime: promo.startTime?.slice(0, 16) || "",
            endTime: promo.endTime?.slice(0, 16) || "",
            minSpending: promo.minSpending ?? "",
            rate: promo.rate ?? "",
            points: promo.points ?? "",
        });
    }

    function handleDelete(promo) {
        if (!window.confirm(`Delete promotion "${promo.name}"?`)) return;
        deleteMutation.mutate(promo.id);
    }

    function handleSubmit(e) {
        e.preventDefault();
        const payload = {
            name: formState.name,
            description: formState.description,
            type: formState.type,
            startTime: formState.startTime,
            endTime: formState.endTime,
            minSpending: formState.minSpending ? Number(formState.minSpending) : undefined,
            rate: formState.rate ? Number(formState.rate) : undefined,
            points: formState.points ? Number(formState.points) : undefined,
        };
        if (formState.id) {
            updateMutation.mutate({ id: formState.id, payload });
        } else {
            createMutation.mutate(payload);
        }
    }

    const columns = useMemo(
        () => [
            { header: "ID", render: (row) => <span className="font-mono text-sm">#{row.id}</span> },
            { header: "Name", render: (row) => row.name },
            { header: "Type", render: (row) => <span className="badge badge-soft capitalize">{row.type}</span> },
            { header: "Start", render: (row) => (row.startTime ? formatDateTime(row.startTime) : "—") },
            { header: "End", render: (row) => (row.endTime ? formatDateTime(row.endTime) : "—") },
            {
                header: "Actions",
                render: (row) => (
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => handleEdit(row)}
                        >
                            Edit
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => handleDelete(row)}
                            disabled={deleteMutation.isLoading}
                        >
                            Delete
                        </button>
                    </div>
                ),
            },
        ],
        [],
    );

    return (
        <AppShell
            title="Manage promotions"
            subtitle="Create and maintain automatic or one-time promotions."
        >
            <Card>
                <FilterBar onSubmit={handleFilterSubmit}>
                    <div className="space-y-2">
                        <label className="text-xs uppercase text-neutral/70 pl-1">Search</label>
                        <input
                            className="input input-bordered input-sm rounded-2xl border border-brand-200 bg-white px-3 py-2 text-sm text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Name"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs uppercase text-neutral/70 pl-1">Type</label>
                        <select
                            className="select select-bordered select-sm rounded-2xl border border-brand-200 bg-white px-3 py-2 text-sm text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="automatic">Automatic</option>
                            <option value="onetime">One-time</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs uppercase text-neutral/70 pl-1">Sort by</label>
                        <select
                            className="select select-bordered select-sm rounded-2xl border border-brand-200 bg-white px-3 py-2 text-sm text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            value={orderBy}
                            onChange={(e) => handleOrderByChange(e.target.value)}
                        >
                            <option value="name">Name</option>
                            <option value="startTime">Start Time</option>
                            <option value="endTime">End Time</option>
                        </select>
                    </div>
                    <button className="btn btn-primary btn-sm" type="submit">
                        Apply
                    </button>
                </FilterBar>
            </Card>

            <Card title="Promotions">
                <QueryBoundary query={promotionsQuery} loadingLabel="Loading promotions…">
                    <DataTable columns={columns} data={data?.results ?? []} />
                </QueryBoundary>
                {data && (
                    <div className="mt-4 flex items-center justify-between">
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </button>
                        <span className="text-sm text-neutral/70">
                            Page {page} of {Math.ceil(data.count / PAGE_SIZE) || 1}
                        </span>
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setPage((p) => (p < Math.ceil(data.count / PAGE_SIZE) ? p + 1 : p))}
                            disabled={!data.count || page >= Math.ceil(data.count / PAGE_SIZE)}
                        >
                            Next
                        </button>
                    </div>
                )}
            </Card>

            <Card title="Promotion form">
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-neutral/70 pl-1">Name</label>
                        <input
                            className="input input-bordered rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            value={formState.name}
                            onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-neutral/70 pl-1">Type</label>
                        <select
                            className="select select-bordered rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            value={formState.type}
                            onChange={(e) => setFormState({ ...formState, type: e.target.value })}
                        >
                            <option value="automatic">Automatic</option>
                            <option value="onetime">One-time</option>
                        </select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <label className="block text-sm font-medium text-neutral/70 pl-1">Description</label>
                        <textarea
                            className="textarea textarea-bordered rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            rows={3}
                            value={formState.description}
                            onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-neutral/70 pl-1">Start time</label>
                        <input
                            type="datetime-local"
                            className="input input-bordered rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            value={formState.startTime}
                            onChange={(e) => setFormState({ ...formState, startTime: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-neutral/70 pl-1">End time</label>
                        <input
                            type="datetime-local"
                            className="input input-bordered rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            value={formState.endTime}
                            onChange={(e) => setFormState({ ...formState, endTime: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-neutral/70 pl-1">Min spending (optional)</label>
                        <input
                            className="input input-bordered rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            type="number"
                            value={formState.minSpending}
                            onChange={(e) => setFormState({ ...formState, minSpending: e.target.value })}
                            placeholder="e.g., 20"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-neutral/70 pl-1">Rate bonus (optional)</label>
                        <input
                            className="input input-bordered rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            type="number"
                            step="0.01"
                            value={formState.rate}
                            onChange={(e) => setFormState({ ...formState, rate: e.target.value })}
                            placeholder="e.g., 0.05"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-neutral/70 pl-1">Points bonus (optional)</label>
                        <input
                            className="input input-bordered rounded-2xl border-2 border-brand-200 bg-white px-4 py-2 text-neutral focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                            type="number"
                            value={formState.points}
                            onChange={(e) => setFormState({ ...formState, points: e.target.value })}
                            placeholder="e.g., 100"
                        />
                    </div>
                    <div className="md:col-span-2 flex gap-3">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={createMutation.isLoading || updateMutation.isLoading}
                        >
                            {formState.id ? "Update promotion" : "Create promotion"}
                        </button>
                        {formState.id && (
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => setFormState(initialForm)}
                            >
                                Cancel edit
                            </button>
                        )}
                    </div>
                </form>
            </Card>
        </AppShell>
    );
}
