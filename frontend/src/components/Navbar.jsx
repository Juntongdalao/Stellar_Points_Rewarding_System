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

    const currentInterface = useMemo(() => {
        if (!user) return "";
        if (location.pathname.startsWith("/manager")) return "manager";
        if (location.pathname.startsWith("/cashier")) return "cashier";
        if (location.pathname.startsWith("/organizer")) return "organizer";
        return "regular";
    }, [location.pathname, user]);

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
    }, [logout, navigate]);

    const linkClass = useCallback(
        ({ isActive }) =>
            cn(
                "btn btn-ghost btn-sm text-sm font-medium normal-case",
                isActive ? "text-primary" : "text-base-content/70",
            ),
        [],
    );

    return (
        <nav className="navbar sticky top-0 z-30 border-b border-base-200/70 bg-white/90 backdrop-blur shadow-sm">
            <div className="flex-1">
                <NavLink to="/" className="btn btn-ghost text-xl font-semibold">
                    StellarPoints
                </NavLink>
            </div>

            <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
                {user &&
                    REGULAR_LINKS.map((link) => (
                        <NavLink key={link.to} to={link.to} className={linkClass}>
                            {link.label}
                        </NavLink>
                    ))}

                {hasRole("cashier") &&
                    cashierLinks.map((link) => (
                        <NavLink key={link.to} to={link.to} className={linkClass}>
                            Cashier: {link.label}
                        </NavLink>
                    ))}

                {hasRole("manager") &&
                    managerLinks.map((link) => (
                        <NavLink key={link.to} to={link.to} className={linkClass}>
                            Manager: {link.label}
                        </NavLink>
                    ))}
                {hasRole("organizer") &&
                    organizerLinks.map((link) => (
                        <NavLink key={link.to} to={link.to} className={linkClass}>
                            Organizer: {link.label}
                        </NavLink>
                    ))}
            </div>

            <div className="flex flex-col items-end gap-2 lg:flex-row lg:items-center lg:gap-4">
                {user && interfaceOptions.length > 1 && (
                    <div className="form-control w-44 lg:w-52">
                        <label className="label p-0 hidden lg:flex">
                            <span className="label-text text-xs uppercase tracking-wide text-base-content/60">
                                Switch interface
                            </span>
                        </label>
                        <select
                            className="select select-bordered select-sm w-full"
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
                        <div className="text-sm text-base-content/80">
                            <div className="font-semibold">{user.utorid}</div>
                            <div className="text-xs capitalize text-base-content/60">
                                {role}
                            </div>
                        </div>
                        <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                ) : (
                    <NavLink to="/login" className="btn btn-primary btn-sm">
                        Login
                    </NavLink>
                )}
            </div>
        </nav>
    );
}
