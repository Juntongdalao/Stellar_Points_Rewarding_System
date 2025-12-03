// Login Page
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export default function LoginPage() {
    const [utorid, setUtorid] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const setAuth = useAuthStore((s) => s.setAuth);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const tokenRes = await fetch(`${API_BASE}/auth/tokens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ utorid, password }),
            });
            const tokenBody = await tokenRes.json().catch(() => ({}));
            if (!tokenRes.ok) {
                throw new Error(tokenBody.error || 'Login failed');
            }
            const { token } = tokenBody;
            if (!token) throw new Error('Server did not return a token');
            // Get Current User with the Token
            const meRes = await fetch(`${API_BASE}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const meBody = await meRes.json().catch(() => ({}));
            if (!meRes.ok) {
                throw new Error(meBody.error || 'Failed to load user profile');
            }
            const user = meBody; // contains what users/me returns
            // Save in store
            setAuth(token, user);
            // Redirect Based on Role
            const role = String(user.role || '').toLowerCase();
            if (role === 'manager' || role === 'superuser') {
                navigate('/manager/users', { replace: true });
            } else if (role === 'cashier') {
                navigate('/cashier/transactions/new', { replace: true });
            } else {
                navigate('/me/points', { replace: true });
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'Login error');
        } finally {
            setLoading(false);
        }
    }
    return (
        <div className="min-h-screen bg-gradient-to-br from-surface-50 via-white to-surface-100 px-4 py-10 flex flex-col items-center justify-center">
            <div className="w-full max-w-md space-y-6 rounded-3xl border border-base-200/70 bg-white/90 p-8 shadow-xl backdrop-blur">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-semibold text-neutral">Welcome back</h1>
                    <p className="text-base text-neutral/70">
                        Sign in with your UTORid credentials to access StellarPoints.
                    </p>
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="form-control">
                        <label htmlFor="utorid" className="label text-sm font-medium text-neutral/80">
                            UTORid
                        </label>
                        <input
                            id="utorid"
                            type="text"
                            value={utorid}
                            onChange={(e) => setUtorid(e.target.value)}
                            required
                            autoComplete="username"
                            className="input input-bordered input-lg"
                            placeholder="e.g., super123"
                            data-cy="login-utorid"
                        />
                    </div>
                    <div className="form-control">
                        <label htmlFor="password" className="label text-sm font-medium text-neutral/80">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            className="input input-bordered input-lg"
                            placeholder="Your password"
                            data-cy="login-password"
                        />
                    </div>
                    {error && (
                        <div className="alert alert-error text-sm">
                            <span>{error}</span>
                        </div>
                    )}
                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-full"
                        disabled={loading}
                        data-cy="login-submit"
                    >
                        {loading ? "Logging in…" : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}
