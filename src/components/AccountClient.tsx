"use client";

import { useState } from "react";
import { changeOwnPassword } from "@/app/actions/account";
import { KeyRound, Check } from "lucide-react";

export function AccountClient({
  user,
}: {
  user: { name?: string | null; email?: string | null; role?: string; department?: string };
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
