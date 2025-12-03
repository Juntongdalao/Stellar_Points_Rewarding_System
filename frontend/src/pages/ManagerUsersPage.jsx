import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../components/layout";
import { Card, DataTable, FilterBar } from "../components/ui";
import { apiFetch } from "../lib/apiClient";
import useAuthStore from "../store/authStore";

const PAGE_SIZE = 10;
const ROLE_OPTIONS = ["regular", "cashier", "manager", "superuser"];

export default function ManagerUsersPage() {
    const [page, setPage] = useState(1);
    const [searchName, setSearchName] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [verifiedFilter, setVerifiedFilter] = useState("");
    const [activatedFilter, setActivatedFilter] = useState("");
    const [banner, setBanner] = useState("");
    const [updatingId, setUpdatingId] = useState(null);

    const queryClient = useQueryClient();
    const hasSuperPowers = useAuthStore((s) => s.hasRole("superuser"));
    const currentUserId = useAuthStore((s) => s.user?.id ?? null);

    const { data, isLoading, isError, error, isFetching } = useQuery({
        queryKey: [
            "manager-users",
            { page, searchName, roleFilter, verifiedFilter, activatedFilter },
        ],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set("page", String(page));
            params.set("limit", String(PAGE_SIZE));
            if (searchName.trim()) params.set("name", searchName.trim());
            if (roleFilter) params.set("role", roleFilter);
            if (verifiedFilter) params.set("verified", verifiedFilter);
            if (activatedFilter) params.set("activated", activatedFilter);
            return apiFetch(`/users?${params.toString()}`);
        },
        keepPreviousData: true,
    });

    const total = data?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const users = data?.results ?? [];

    const roleChoices = useMemo(
        () => (hasSuperPowers ? ROLE_OPTIONS : ["regular", "cashier"]),
        [hasSuperPowers],
    );

    function handleFilters(e) {
        e.preventDefault();
        setPage(1);
    }

    function handleResetFilters() {
        setSearchName("");
        setRoleFilter("");
        setVerifiedFilter("");
        setActivatedFilter("");
        setPage(1);
    }

    async function updateUser(userId, payload, successText) {
        setBanner("");
        setUpdatingId(userId);
        try {
            await apiFetch(`/users/${userId}`, {
                method: "PATCH",
                body: payload,
            });
            setBanner(successText);
            await queryClient.invalidateQueries({ queryKey: ["manager-users"] });
        } catch (err) {
            setBanner(err.message || "Unable to update user.");
        } finally {
            setUpdatingId(null);
        }
    }

    const columns = useMemo(
        () => [
            {
                header: "User",
                headerClassName: "min-w-[220px]",
                render: (u) => (
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-base-content">
                            {u.name ?? u.utorid}
                        </p>
                        <p className="text-xs text-neutral/70">{u.email}</p>
                        <p className="text-xs text-neutral/60">UTORid: {u.utorid}</p>
                    </div>
                ),
            },
            {
                header: "Role",
                headerClassName: "w-48",
                render: (u) => {
                    const options = roleChoices.includes(u.role)
                        ? roleChoices
                        : [...roleChoices, u.role];
                    const disabled =
                        updatingId === u.id ||
                        u.id === currentUserId ||
                        (!hasSuperPowers && (u.role === "manager" || u.role === "superuser"));
                    return (
                        <div className="space-y-2">
                            <select
                                className="select select-bordered select-sm w-full"
                                value={u.role}
                                disabled={disabled}
                                onChange={(event) => {
                                    const nextRole = event.target.value;
                                    if (nextRole === u.role) return;
                                    updateUser(
                                        u.id,
                                        { role: nextRole },
                                        `Updated ${u.utorid} to ${nextRole}.`,
                                    );
                                }}
                            >
                                {options.map((role) => (
                                    <option
                                        key={`${u.id}-${role}`}
                                        value={role}
                                        disabled={
                                            role === "cashier" &&
                                            u.suspicious &&
                                            u.role !== "cashier"
                                        }
                                    >
                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                        {role === "superuser" ? " ⭐" : ""}
                                    </option>
                                ))}
                            </select>
                            {u.suspicious && (
                                <p className="text-xs text-error">
                                    Suspicious users cannot be promoted to cashier.
                                </p>
                            )}
                        </div>
                    );
                },
            },
            {
                header: "Verification",
                headerClassName: "w-40",
                render: (u) => (
                    <button
                        type="button"
                        className={`btn btn-sm w-full ${
                            u.verified ? "btn-success" : "btn-outline"
                        }`}
                        disabled={updatingId === u.id}
                        onClick={() =>
                            updateUser(
                                u.id,
                                { verified: !u.verified },
                                `${u.utorid} marked as ${!u.verified ? "verified" : "unverified"}.`,
                            )
                        }
                    >
                        {u.verified ? "Verified" : "Unverified"}
                    </button>
                ),
            },
            {
                header: "Status",
                headerClassName: "w-48",
                render: (u) => (
                    <div className="flex flex-col gap-2">
                        <span
                            className={`badge ${
                                u.suspicious ? "badge-error" : "badge-outline"
                            }`}
                        >
                            {u.suspicious ? "Suspicious" : "Clean"}
                        </span>
                        <span className="badge badge-outline">
                            {u.points ?? 0} pts
                        </span>
                        {u.role === "superuser" && (
                            <span className="badge badge-warning badge-outline">
                                Superuser
                            </span>
                        )}
                    </div>
                ),
            },
            {
                header: "Flags",
                headerClassName: "w-52",
                render: (u) => (
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            className="btn btn-xs"
                            disabled={updatingId === u.id}
                            onClick={() =>
                                updateUser(
                                    u.id,
                                    { suspicious: !u.suspicious },
                                    `${u.utorid} marked as ${!u.suspicious ? "suspicious" : "clear"}.`,
                                )
                            }
                        >
                            {u.suspicious ? "Clear flag" : "Flag suspicious"}
                        </button>
                        <p className="text-xs text-neutral/60">
                            Use flags before demoting/pending investigations.
                        </p>
                    </div>
                ),
            },
        ],
        [currentUserId, hasSuperPowers, roleChoices, updatingId],
    );

    return (
        <AppShell
            title="User administration"
            subtitle={
                hasSuperPowers
                    ? "Superusers can promote/demote managers and fellow supers while keeping suspicious users out of cashier roles."
                    : "Managers may onboard users, verify identities, and escalate flags."
            }
        >
            {banner && (
                <Card>
                    <p className="text-sm text-primary">{banner}</p>
                </Card>
            )}

            <Card title="Filters">
                <FilterBar onSubmit={handleFilters} onReset={handleResetFilters}>
                    <div className="form-control flex-1 min-w-[180px]">
                        <label className="label text-xs uppercase text-neutral/60">
                            Search (name or UTORid)
                        </label>
                        <input
                            className="input input-bordered input-sm"
                            placeholder="e.g., super123"
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                        />
                    </div>
                    <div className="form-control w-40">
                        <label className="label text-xs uppercase text-neutral/60">Role</label>
                        <select
                            className="select select-bordered select-sm"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="">All</option>
                            {ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role}>
                                    {role}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-control w-40">
                        <label className="label text-xs uppercase text-neutral/60">
                            Verified
                        </label>
                        <select
                            className="select select-bordered select-sm"
                            value={verifiedFilter}
                            onChange={(e) => setVerifiedFilter(e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="true">Verified</option>
                            <option value="false">Unverified</option>
                        </select>
                    </div>
                    <div className="form-control w-40">
                        <label className="label text-xs uppercase text-neutral/60">
                            Activated
                        </label>
                        <select
                            className="select select-bordered select-sm"
                            value={activatedFilter}
                            onChange={(e) => setActivatedFilter(e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="true">Active</option>
                            <option value="false">Pending reset</option>
                        </select>
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
                title="All users"
                actions={
                    isFetching ? (
                        <span className="text-sm text-neutral/60">Refreshing…</span>
                    ) : undefined
                }
            >
                {isLoading && (
                    <div className="py-10 text-center text-neutral/60">Loading users…</div>
                )}
                {isError && (
                    <div className="py-4 text-center text-error">
                        {error?.message || "Unable to load users."}
                    </div>
                )}
                {!isLoading && !isError && (
                    <>
                        <DataTable
                            data={users}
                            columns={columns}
                            emptyMessage="No users match the current filters."
                        />
                        {total > 0 && (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                                <button
                                    className="btn btn-outline btn-sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-neutral/70">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    className="btn btn-outline btn-sm"
                                    onClick={() =>
                                        setPage((p) => (p < totalPages ? p + 1 : p))
                                    }
                                    disabled={page >= totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </Card>
        </AppShell>
    );
}
