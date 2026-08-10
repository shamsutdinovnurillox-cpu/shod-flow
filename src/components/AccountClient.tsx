"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeOwnPassword, startMfaSetup, confirmMfaSetup, disableMfa } from "@/app/actions/account";
import { KeyRound, Check, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";

export function AccountClient({
  user,
  mfaEnabled,
}: {
  user: { name?: string | null; email?: string | null; role?: string; department?: string };
  mfaEnabled: boolean;
}) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDone(false);
    if (form.newPassword !== form.confirm) {
      setError("Yangi parol tasdiq bilan mos kelmadi.");
      return;
    }
    setLoading(true);
    try {
      await changeOwnPassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parolni o'zgartirib bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Account settings</h1>
        <p className="text-sm text-muted mt-0.5">Manage your profile and password.</p>
      </div>

      {/* Profil ma'lumoti */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-fg mb-4">Profile</h2>
        <dl className="space-y-3">
          <Row k="Name" v={user.name ?? "—"} />
          <Row k="Email" v={user.email ?? "—"} />
          <Row k="Role" v={user.role ?? "—"} />
          <Row k="Department" v={user.department ?? "—"} />
        </dl>
      </div>

      {/* Parol o'zgartirish */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="h-5 w-5 text-muted" />
          <h2 className="text-lg font-bold text-fg">Change password</h2>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg">Current password</label>
            <input required type="password" autoComplete="current-password" value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} className="modal-input !mt-0" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg">New password</label>
              <input required type="password" autoComplete="new-password" minLength={8} value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })} className="modal-input !mt-0" placeholder="min 8 belgi" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg">Confirm new password</label>
              <input required type="password" autoComplete="new-password" value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })} className="modal-input !mt-0" />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</div>
          )}
          {done && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              <Check className="h-4 w-4" /> Parol muvaffaqiyatli o&apos;zgartirildi.
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {loading ? "Saving…" : "Update password"}
            </button>
          </div>
        </form>
      </div>

      {/* Ikki faktorli autentifikatsiya */}
      <MfaCard enabled={mfaEnabled} />
    </div>
  );
}

function MfaCard({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "setup">("idle");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const begin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await startMfaSetup();
      setQr(res.qr);
      setSecret(res.secret);
      setPhase("setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sozlashni boshlab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await confirmMfaSetup(code);
      setPhase("idle");
      setCode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tasdiqlab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  const turnOff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await disableMfa(password);
      setPassword("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "O'chirib bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-muted" />
          <h2 className="text-lg font-bold text-fg">Two-factor authentication</h2>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${enabled ? "bg-green-50 text-green-700" : "bg-surface-2 text-muted"}`}>
          {enabled ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </div>
      <p className="text-sm text-muted mb-4">
        Authenticator ilovasi (Google Authenticator, Authy) orqali qo&apos;shimcha himoya.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</div>
      )}

      {enabled ? (
        <form onSubmit={turnOff} className="space-y-3">
          <p className="text-sm text-fg">2FA yoqilgan. O&apos;chirish uchun parolingizni tasdiqlang.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="password"
              autoComplete="current-password"
              required
              placeholder="Parol"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="modal-input !mt-0 sm:max-w-xs"
            />
            <button type="submit" disabled={loading}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors">
              {loading ? "…" : "Disable 2FA"}
            </button>
          </div>
        </form>
      ) : phase === "idle" ? (
        <button onClick={begin} disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {loading ? "…" : "Enable 2FA"}
        </button>
      ) : (
        <div className="space-y-4">
          <ol className="list-decimal space-y-3 pl-5 text-sm text-fg marker:text-muted">
            <li>Authenticator ilovasida QR kodni skaner qiling (yoki kalitni qo&apos;lda kiriting).</li>
            <li>Ilova bergan 6 xonali kodni pastga kiriting.</li>
          </ol>
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="2FA QR kod" width={180} height={180} className="rounded-lg border border-border bg-white p-2" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted mb-1">Qo&apos;lda kiritish kaliti:</p>
              <code className="block break-all rounded-lg bg-surface-2 px-3 py-2 text-sm text-fg">{secret}</code>
              <form onSubmit={confirm} className="mt-4 space-y-3">
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="modal-input !mt-0"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={loading}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
                    {loading ? "…" : "Verify & Enable"}
                  </button>
                  <button type="button" onClick={() => setPhase("idle")}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-surface-2">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-border/60 pb-2.5 last:border-0 last:pb-0 text-sm">
      <dt className="text-muted">{k}</dt>
      <dd className="font-medium text-fg">{v}</dd>
    </div>
  );
}
