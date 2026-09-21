import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { Eye, EyeOff, Loader2, ShieldCheck, Truck, Wallet } from 'lucide-react';
import logo from '../assets/logo.png';

// What this console is actually for. Kept concrete - these are the screens
// behind the sign-in, not a slogan.
const CAPABILITIES = [
    { icon: Truck, label: 'Live pickups', detail: 'Track every request from posted to completed' },
    { icon: ShieldCheck, label: 'KYC review', detail: 'Approve the collectors who can take paid work' },
    { icon: Wallet, label: 'Payouts', detail: 'Reconcile wallet transactions and withdrawals' },
];

export default function Login() {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authApi.login(credentials);
            if (!response.access) {
                // No access token means the backend returned an OTP challenge.
                // Admin accounts bypass OTP, so reaching here means this
                // account is not an admin.
                setError('You do not have admin privileges or your account is restricted.');
                return;
            }
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] bg-white dark:bg-gray-950 font-sans">

            {/* Brand panel. Hidden below lg - on a phone it would push the
                form itself below the fold. */}
            <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-primary-900 px-14 py-12 text-white">
                {/* Depth without an image: two soft radial washes over the
                    green, so the panel is not a flat rectangle. */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-70"
                    style={{
                        background:
                            'radial-gradient(60rem 40rem at 15% 10%, rgba(16,185,129,0.28), transparent 60%),' +
                            'radial-gradient(45rem 35rem at 90% 95%, rgba(4,120,87,0.45), transparent 55%)',
                    }}
                />

                <div className="relative flex items-center gap-3">
                    {/* The logo PNG has no alpha - its white background is baked
                        in - so it is given a deliberate white tile rather than
                        left to read as a stray box on the green. */}
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
                        <img src={logo} alt="" className="h-8 w-8 object-contain" />
                    </span>
                    <span className="text-lg font-semibold tracking-tight">Revesta</span>
                    <span className="ml-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium tracking-wide">
                        Admin
                    </span>
                </div>

                <div className="relative max-w-md">
                    <h1 className="text-[2.75rem] font-bold leading-[1.1] tracking-tight text-balance">
                        The whole network,
                        <span className="block text-primary-300">on one screen.</span>
                    </h1>
                    <p className="mt-5 text-[15px] leading-relaxed text-primary-100/80">
                        Revesta connects the people clearing waste with the collectors and
                        recyclers who move it. This is where that network is run.
                    </p>

                    <ul className="mt-10 space-y-5">
                        {CAPABILITIES.map(({ icon: Icon, label, detail }) => (
                            <li key={label} className="flex items-start gap-3.5">
                                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15">
                                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                                </span>
                                <span>
                                    <span className="block text-sm font-semibold">{label}</span>
                                    <span className="block text-sm text-primary-100/70">{detail}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative text-xs text-primary-100/50">
                    Accra, Ghana · Staff access only
                </p>
            </aside>

            {/* Form */}
            <main className="flex items-center justify-center px-6 py-12 sm:px-12">
                <div className="w-full max-w-[400px]">
                    {/* The brand only appears here when the panel is hidden,
                        so the page still identifies itself on a phone. */}
                    <div className="mb-10 flex items-center gap-3 lg:hidden">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white ring-1 ring-gray-200 dark:ring-gray-700">
                            <img src={logo} alt="" className="h-7 w-7 object-contain" />
                        </span>
                        <span className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                            Revesta <span className="text-primary-600 dark:text-primary-400">Admin</span>
                        </span>
                    </div>

                    <h2 className="text-[26px] font-bold tracking-tight text-gray-900 dark:text-white">
                        Sign in
                    </h2>
                    <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                        Use the admin account issued to you.
                    </p>

                    {error && (
                        <div
                            role="alert"
                            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                        <div>
                            {/* Labelled "Username" because that is the field the
                                token endpoint takes - it does not accept an
                                email address, and the old placeholder said
                                "Email and username", which it never was. */}
                            <label
                                htmlFor="username"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                autoFocus
                                required
                                aria-invalid={!!error}
                                value={credentials.username}
                                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                                className="mt-1.5 block w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-[15px] text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
                                placeholder="your.username"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Password
                            </label>
                            <div className="relative mt-1.5">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    aria-invalid={!!error}
                                    value={credentials.password}
                                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                    className="block w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 pr-11 text-[15px] text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-3 text-gray-400 transition-colors hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-600 dark:hover:text-gray-200"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
                                    Signing in…
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-xs leading-relaxed text-gray-400 dark:text-gray-500">
                        Trouble signing in? Admin accounts are created by a super
                        administrator — ask them to reset yours rather than registering
                        a new one.
                    </p>
                </div>
            </main>
        </div>
    );
}
