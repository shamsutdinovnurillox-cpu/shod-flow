"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Truck, LogIn, Smartphone, ArrowLeft } from "lucide-react";
import { preAuth } from "@/app/actions/login-actions";

// Demo hisoblar faqat developmentda ko'rsatiladi (prodda seed parollari sir emasligi xavfli).
const SHOW_DEMO = process.env.NODE_ENV !== "production";
const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@shodflow.com" },
  { label: "Fleet", email: "fleet@shodflow.com" },
  { label: "Safety", email: "safety@shodflow.com" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [phase, setPhase] = useState<"credentials" | "mfa">("credentials");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 1-bosqich: email + parol. MFA yoqilgan bo'lsa 2-bosqichga o'tadi.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const pre = await preAuth(email, password);
      if (!pre.ok) {
        setError("Invalid email or password");
        return;
      }
      if (pre.mfaRequired) {
        setPhase("mfa");
        return;
      }
      await finishSignIn();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // 2-bosqich: TOTP kod bilan yakuniy kirish.
  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await finishSignIn(token);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const finishSignIn = async (mfaToken?: string) => {
    const res = await signIn("credentials", {
      email,
      password,
      token: mfaToken ?? "",
      redirect: false,
    });
    if (res?.error) {
      setError(phase === "mfa" || mfaToken ? "Kod noto'g'ri yoki muddati tugagan" : "Invalid email or password");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const backToCredentials = () => {
    setPhase("credentials");
    setToken("");
    setError("");
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
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-xl sm:p-10">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 text-white shadow-lg">
              <Truck className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-fg">Shod Flow</h1>
            <p className="mt-1 text-sm text-muted">Fleet &amp; Safety Platform</p>
          </div>

          {phase === "credentials" ? (
            <>
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
                    className="modal-input !mt-0"
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
                    className="modal-input !mt-0"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-70"
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
                      className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-xs font-medium text-muted transition-colors hover:border-blue-300 hover:text-blue-600"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-center text-xs text-faint">parol: password123</p>
              </div>
              )}
            </>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={handleMfa}>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Smartphone className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm text-muted">
                  Authenticator ilovasidagi 6 xonali kodni kiriting.
                </p>
              </div>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                className="modal-input !mt-0 text-center tracking-[0.5em] text-lg"
                placeholder="123456"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-70"
              >
                <LogIn className="h-4 w-4" />
                {loading ? "Verifying…" : "Verify & sign in"}
              </button>
              <button
                type="button"
                onClick={backToCredentials}
                className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-muted hover:text-fg"
              >
                <ArrowLeft className="h-4 w-4" /> Orqaga
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
