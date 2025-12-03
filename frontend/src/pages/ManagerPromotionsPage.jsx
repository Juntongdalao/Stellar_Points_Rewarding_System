import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../components/layout";
import { Card, DataTable, FilterBar } from "../components/ui";
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
    const [formState, setFormState] = useState(initialForm);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["manager-promotions", { page, search, typeFilter }],
        queryFn: () => {
            const params = new URLSearchParams();
            params.set("page", String(page));
            params.set("limit", String(PAGE_SIZE));
            if (search.trim()) params.set("name", search.trim());
            if (typeFilter) params.set("type", typeFilter);
            return apiFetch(`/promotions?${params.toString()}`);
        },
        keepPreviousData: true,
    });

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
                    <div className="form-control">
                        <label className="label text-xs uppercase text-neutral/70">Search</label>
                        <input
                            className="input input-bordered input-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Name"
                        />
                    </div>
                    <div className="form-control">
                        <label className="label text-xs uppercase text-neutral/70">Type</label>
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

            <Card title="Promotion form">
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                    <div className="form-control">
                        <label className="label text-sm font-medium">Name</label>
                        <input
                            className="input input-bordered"
                            value={formState.name}
                            onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-control">
                        <label className="label text-sm font-medium">Type</label>
                        <select
                            className="select select-bordered"
                            value={formState.type}
                            onChange={(e) => setFormState({ ...formState, type: e.target.value })}
                        >
                            <option value="automatic">Automatic</option>
                            <option value="onetime">One-time</option>
                        </select>
                    </div>
                    <div className="form-control md:col-span-2">
                        <label className="label text-sm font-medium">Description</label>
                        <textarea
                            className="textarea textarea-bordered"
                            rows={3}
                            value={formState.description}
                            onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                        />
                    </div>
                    <div className="form-control">
                        <label className="label text-sm font-medium">Start time</label>
                        <input
                            type="datetime-local"
                            className="input input-bordered"
                            value={formState.startTime}
                            onChange={(e) => setFormState({ ...formState, startTime: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-control">
                        <label className="label text-sm font-medium">End time</label>
                        <input
                            type="datetime-local"
                            className="input input-bordered"
                            value={formState.endTime}
                            onChange={(e) => setFormState({ ...formState, endTime: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-control">
                        <label className="label text-sm font-medium">Min spending (optional)</label>
                        <input
                            className="input input-bordered"
                            type="number"
                            value={formState.minSpending}
                            onChange={(e) => setFormState({ ...formState, minSpending: e.target.value })}
                            placeholder="e.g., 20"
                        />
                    </div>
                    <div className="form-control">
                        <label className="label text-sm font-medium">Rate bonus (optional)</label>
                        <input
                            className="input input-bordered"
                            type="number"
                            step="0.01"
                            value={formState.rate}
                            onChange={(e) => setFormState({ ...formState, rate: e.target.value })}
                            placeholder="e.g., 0.05"
                        />
                    </div>
                    <div className="form-control">
                        <label className="label text-sm font-medium">Points bonus (optional)</label>
                        <input
                            className="input input-bordered"
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

            <Card title="Promotions">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <span className="loading loading-spinner text-primary" />
                    </div>
                ) : isError ? (
                    <p className="text-error">{error?.message}</p>
                ) : (
                    <DataTable columns={columns} data={data?.results ?? []} />
                )}
                {data && data.count > PAGE_SIZE && (
                    <div className="mt-4 flex items-center justify-between">
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </button>
                        <span className="text-sm text-neutral/70">
                            Page {page} of {Math.ceil(data.count / PAGE_SIZE)}
                        </span>
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setPage((p) => (p < Math.ceil(data.count / PAGE_SIZE) ? p + 1 : p))}
                            disabled={page >= Math.ceil(data.count / PAGE_SIZE)}
                        >
                            Next
                        </button>
                    </div>
                )}
            </Card>
        </AppShell>
    );
}
