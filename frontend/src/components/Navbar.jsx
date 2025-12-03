import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useMemo } from "react";
import useAuthStore from "../store/authStore";
import { cn } from "../lib/cn";

const REGULAR_LINKS = [
    { to: "/me", label: "Home" },
    { to: "/me/profile", label: "Profile" },
    { to: "/me/qr", label: "My QR" },
    { to: "/me/points", label: "My Points" },
    { to: "/events", label: "Events" },
    { to: "/me/transactions", label: "Transactions" },
    { to: "/me/transfer", label: "Transfer" },
    { to: "/me/redeem", label: "Redeem" },
    { to: "/me/promotions", label: "Promotions" },
];

const INTERFACE_ROUTES = {
    regular: "/me",
    cashier: "/cashier",
    manager: "/manager/users",
    organizer: "/organizer/events",
    superuser: "/manager/users",
};

const DRAWER_ID = "primary-nav-drawer";

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAuthStore((s) => s.user);
    const hasRole = useAuthStore((s) => s.hasRole);
    const logout = useAuthStore((s) => s.logout);

    const role = user ? String(user.role || "regular").toLowerCase() : null;

    const cashierLinks = useMemo(
        () => [
            { to: "/cashier", label: "Dashboard" },
        ],
        [],
    );

    const managerLinks = useMemo(
        () => [
            { to: "/manager/users", label: "Users" },
            { to: "/manager/transactions", label: "Transactions" },
            { to: "/manager/promotions", label: "Promotions" },
            { to: "/manager/events", label: "Events" },
        ],
        [],
    );

    const organizerLinks = useMemo(
        () => [
            { to: "/organizer/events", label: "Events" },
        ],
        [],
    );

    const interfaceOptions = useMemo(() => {
        if (!user) return [];
        const options = [
            { key: "regular", label: "Regular", path: INTERFACE_ROUTES.regular },
        ];
        if (hasRole("cashier")) {
            options.push({
                key: "cashier",
                label: "Cashier",
                path: INTERFACE_ROUTES.cashier,
            });
        }
        if (hasRole("manager")) {
            options.push({
                key: "manager",
                label: "Manager",
                path: INTERFACE_ROUTES.manager,
            });
        }
        if (hasRole("organizer")) {
            options.push({
                key: "organizer",
                label: "Organizer",
                path: INTERFACE_ROUTES.organizer,
            });
        }
        if (hasRole("superuser")) {
            options.push({
                key: "superuser",
                label: "Superuser",
                path: INTERFACE_ROUTES.superuser,
            });
        }
        return options;
    }, [user, hasRole]);

    const navGroups = useMemo(() => {
        if (!user) return [];
        const groups = [
            { key: "regular", title: "My experience", links: REGULAR_LINKS },
        ];
        if (hasRole("cashier")) {
            groups.push({ key: "cashier", title: "Cashier tools", links: cashierLinks });
        }
        if (hasRole("manager")) {
            groups.push({ key: "manager", title: "Manager admin", links: managerLinks });
        }
        if (hasRole("organizer")) {
            groups.push({ key: "organizer", title: "Event organizer", links: organizerLinks });
        }
        return groups;
    }, [user, hasRole, cashierLinks, managerLinks, organizerLinks]);

    const currentInterface = useMemo(() => {
        if (!user) return "";
        if (location.pathname.startsWith("/manager")) return "manager";
        if (location.pathname.startsWith("/cashier")) return "cashier";
        if (location.pathname.startsWith("/organizer")) return "organizer";
        return "regular";
    }, [location.pathname, user]);

    const closeDrawer = useCallback(() => {
        if (typeof document === "undefined") return;
        const toggle = document.getElementById(DRAWER_ID);
        if (toggle && toggle instanceof HTMLInputElement) {
            toggle.checked = false;
        }
    }, []);

    const handleInterfaceChange = useCallback(
        (event) => {
            const next = interfaceOptions.find(
                (option) => option.key === event.target.value,
            );
            if (next) navigate(next.path);
        },
        [interfaceOptions, navigate],
    );

    const handleLogout = useCallback(() => {
        logout();
        navigate("/login", { replace: true });
        closeDrawer();
    }, [logout, navigate, closeDrawer]);

    const inlineLinkClass = useCallback(
        ({ isActive }) =>
            cn(
                "btn btn-ghost btn-sm rounded-full px-4 text-base font-medium normal-case",
                isActive
                    ? "bg-brand-100 text-brand-700"
                    : "text-neutral/80 hover:text-brand-600",
            ),
        [],
    );

    const drawerLinkClass = useCallback(
        ({ isActive }) =>
            cn(
                "text-base font-medium",
                isActive ? "text-brand-600" : "text-neutral/80",
            ),
        [],
    );

    const drawerMenu = user ? (
        <div className="flex h-full flex-col gap-4 p-4">
            <div className="rounded-2xl border border-base-200 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-neutral/60">
                    Signed in
                </p>
                <p className="text-lg font-semibold text-neutral">
                    {user.utorid}
                </p>
                <p className="text-sm capitalize text-neutral/70">{role}</p>
            </div>
            {navGroups.map((group) => (
                <div key={group.key}>
                    <p className="text-xs uppercase tracking-wide text-neutral/50">
                        {group.title}
                    </p>
                    <ul className="menu mt-1 rounded-2xl bg-transparent p-0">
                        {group.links.map((link) => (
                            <li key={link.to}>
                                <NavLink
                                    to={link.to}
                                    className={drawerLinkClass}
                                    onClick={closeDrawer}
                                >
                                    {link.label}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
            {interfaceOptions.length > 1 && (
                <div className="form-control">
                    <label className="text-xs uppercase text-neutral/60">
                        Switch interface
                    </label>
                    <select
                        className="select select-bordered mt-1"
                        value={currentInterface}
                        onChange={(event) => {
                            closeDrawer();
                            handleInterfaceChange(event);
                        }}
                    >
                        {interfaceOptions.map((option) => (
                            <option key={option.key} value={option.key}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            <button
                type="button"
                className="btn btn-outline mt-auto"
                onClick={handleLogout}
            >
                Logout
            </button>
        </div>
    ) : (
        <div className="flex h-full flex-col gap-4 p-4">
            <p className="text-sm text-neutral">
                You are not signed in. Use the button below to log in.
            </p>
            <NavLink
                to="/login"
                className="btn btn-primary"
                onClick={closeDrawer}
            >
                Login
            </NavLink>
        </div>
    );

    return (
        <>
            <header className="sticky top-0 z-40 border-b border-base-200/70 bg-white/90 backdrop-blur shadow-sm">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
                    <div className="flex items-center gap-3">
                        {user && (
                            <label
                                htmlFor={DRAWER_ID}
                                className="btn btn-ghost btn-square btn-sm border border-base-200 lg:hidden"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                                    />
                                </svg>
                                <span className="sr-only">Open navigation</span>
                            </label>
                        )}
                        <NavLink to="/" className="btn btn-ghost text-xl font-semibold normal-case">
                            StellarPoints
                        </NavLink>
                    </div>

                    {user && (
                        <div className="hidden flex-1 flex-wrap gap-6 lg:flex">
                            {navGroups.map((group) => (
                                <div key={group.key} className="min-w-[180px]">
                                    <p className="text-[11px] uppercase tracking-wide text-neutral/50">
                                        {group.title}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {group.links.map((link) => (
                                            <NavLink
                                                key={link.to}
                                                to={link.to}
                                                className={inlineLinkClass}
                                            >
                                                {link.label}
                                            </NavLink>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-4">
                        {user && interfaceOptions.length > 1 && (
                            <div className="hidden lg:flex lg:flex-col">
                                <label className="text-xs uppercase text-neutral/50">
                                    Switch interface
                                </label>
                                <select
                                    className="select select-bordered select-sm mt-1"
                                    value={currentInterface}
                                    onChange={handleInterfaceChange}
                                >
                                    {interfaceOptions.map((option) => (
                                        <option key={option.key} value={option.key}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {user ? (
                            <div className="flex items-center gap-3">
                                <div className="text-right text-sm leading-tight text-neutral/80">
                                    <div className="font-semibold text-neutral">
                                        {user.utorid}
                                    </div>
                                    <div className="text-xs capitalize text-neutral/60">
                                        {role}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-outline btn-sm hidden lg:inline-flex"
                                    onClick={handleLogout}
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <NavLink
                                to="/login"
                                className="btn btn-sm bg-white text-brand-600 border border-brand-500 hover:bg-brand-600 hover:text-white"
                            >
                                Login
                            </NavLink>
                        )}
                    </div>
                </div>
            </header>

            <div className="drawer drawer-end lg:hidden">
                <input id={DRAWER_ID} type="checkbox" className="drawer-toggle" />
                <div className="drawer-content" />
                <div className="drawer-side z-50">
                    <label htmlFor={DRAWER_ID} className="drawer-overlay" />
                    <div className="w-80 max-w-[80vw] bg-base-100">{drawerMenu}</div>
                </div>
            </div>
        </>
    );
}
