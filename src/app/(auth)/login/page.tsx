"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Truck, LogIn } from "lucide-react";

// Demo hisoblar faqat developmentda ko'rsatiladi (prodda seed parollari sir emasligi xavfli).
const SHOW_DEMO = process.env.NODE_ENV !== "production";
const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@shodflow.com" },
  { label: "Fleet", email: "fleet@shodflow.com" },
  { label: "Safety", email: "safety@shodflow.com" },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isStale = searchParams.has("stale");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Eskirgan sessiya bilan kelinganda cookie'ni tozalaymiz — aks holda
  // foydalanuvchi kirgan holatda qolib, har bir sahifada shu yerga qaytadi.
  useEffect(() => {
    if (isStale) signOut({ redirect: false });
  }, [isStale]);

  // Email + parol bilan bir bosqichda kirish.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError("Invalid email or password");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4 py-12">
      {/* fon aksentlari */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="animate-slide-up rounded-2xl border border-border bg-surface p-7 shadow-[var(--shadow-xl)] sm:p-10">
          <div className="text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 text-white shadow-[var(--shadow-md)]">
              <Truck className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-fg">Shod Flow</h1>
            <p className="mt-1 text-sm text-muted">Fleet &amp; Safety Platform</p>
          </div>

          {isStale && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm font-medium text-amber-700">
              Sessiyangiz muddati tugagan. Iltimos, qaytadan kiring.
            </div>
          )}

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-fg">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="modal-input"
                placeholder="you@shodflow.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-fg">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="modal-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="animate-fade-in rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-center text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg w-full"
            >
              <LogIn className="h-4 w-4" />
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {SHOW_DEMO && (
            <div className="mt-6 border-t border-border pt-5">
              <p className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-faint">
                Demo hisoblar (bosib to&apos;ldiring)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => fillDemo(a.email)}
                    className="btn btn-secondary btn-sm justify-center hover:border-blue-300 hover:text-blue-600"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-xs text-faint">parol: password123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// `useSearchParams()` sahifani client-render'ga majburlaydi; Next uni Suspense
// chegarasida bo'lishini talab qiladi, aks holda prod build /login'da uziladi.
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bg">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
