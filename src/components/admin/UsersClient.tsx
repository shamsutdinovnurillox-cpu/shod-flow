"use client";

import { showError } from "@/components/ui/toast";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser, setUserActive, updateUserRole, adminResetPassword, updateUserPermissions, adminDisableMfa } from "@/app/actions/users";
import type { UserRow } from "@/types/models";
import { Modal, Field, ModalActions } from "@/components/ui/profile";
import { FLEET_MODULES, SAFETY_MODULES } from "@/lib/modules";
import { UserPlus, KeyRound, ShieldCheck, Power, ListChecks, Smartphone, ShieldOff } from "lucide-react";

const ROLES = ["ADMIN", "FLEET_USER", "SAFETY_USER"];
const DEPTS = ["ADMIN", "FLEET", "SAFETY"];

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-purple-50 text-purple-700",
  FLEET_USER: "bg-blue-50 text-blue-700",
  SAFETY_USER: "bg-emerald-50 text-emerald-700",
};

export function UsersClient({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [modal, setModal] = useState<null | "add" | "role" | "reset" | "perms">(null);
  const [target, setTarget] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(false);

  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", role: "FLEET_USER", department: "FLEET" });
  const [roleForm, setRoleForm] = useState({ role: "FLEET_USER", department: "FLEET" });
  const [newPassword, setNewPassword] = useState("");
  const [permSet, setPermSet] = useState<Set<string>>(new Set());

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setLoading(true);
    try {
      await fn();
      setModal(null);
      setTarget(null);
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : fallback);
    } finally {
      setLoading(false);
    }
  };

  const openRole = (u: UserRow) => {
    setTarget(u);
    setRoleForm({ role: u.role, department: u.department });
    setModal("role");
  };
  const openReset = (u: UserRow) => {
    setTarget(u);
    setNewPassword("");
    setModal("reset");
  };
  const openPerms = (u: UserRow) => {
    setTarget(u);
    setPermSet(new Set(u.permissions));
    setModal("perms");
  };
  const togglePerm = (key: string) => {
    setPermSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Users</h1>
          <p className="text-sm text-muted mt-0.5">Create, assign roles, deactivate, and reset passwords.</p>
        </div>
        <button
          onClick={() => { setAddForm({ name: "", email: "", password: "", role: "FLEET_USER", department: "FLEET" }); setModal("add"); }}
          className="btn btn-primary"
        >
          <UserPlus className="h-4 w-4" />
          Add User
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="border-b border-border bg-surface-2/70">
              <tr>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Name</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Email</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Role</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Department</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">2FA</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Status</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted">No users found.</td></tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  return (
                    <tr key={u.id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-5 py-3.5 sm:px-6 font-medium text-fg">
                        {u.name}
                        {isSelf && <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-xs text-muted">you</span>}
                      </td>
                      <td className="px-5 py-3.5 sm:px-6">{u.email}</td>
                      <td className="px-5 py-3.5 sm:px-6">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${ROLE_STYLES[u.role] ?? "bg-surface-2 text-muted"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 sm:px-6">{u.department}</td>
                      <td className="px-5 py-3.5 sm:px-6">
                        {u.mfaEnabled ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                            <Smartphone className="h-3 w-3" /> On
                          </span>
                        ) : (
                          <span className="text-xs text-faint">Off</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 sm:px-6">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${u.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-green-500" : "bg-red-500"}`} />
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 sm:px-6">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openRole(u)} title="Edit role" className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
                            <ShieldCheck className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openPerms(u)}
                            disabled={u.role === "ADMIN"}
                            title={u.role === "ADMIN" ? "Admin barcha modullarga ega" : "Module permissions"}
                            className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ListChecks className="h-4 w-4" />
                          </button>
                          <button onClick={() => openReset(u)} title="Reset password" className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
                            <KeyRound className="h-4 w-4" />
                          </button>
                          {u.mfaEnabled && (
                            <button
                              onClick={() => { if (confirm(`${u.name} uchun 2FA'ni o'chirasizmi?`)) run(() => adminDisableMfa(u.id), "2FA'ni o'chirib bo'lmadi."); }}
                              title="Disable 2FA (reset)"
                              className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-amber-600"
                            >
                              <ShieldOff className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => run(() => setUserActive(u.id, !u.isActive), "Holatni o'zgartirib bo'lmadi.")}
                            disabled={isSelf}
                            title={isSelf ? "O'zingizni faolsizlantirib bo'lmaydi" : u.isActive ? "Deactivate" : "Activate"}
                            className={`rounded-md p-1.5 hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed ${u.isActive ? "text-red-600" : "text-green-600"}`}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add user */}
      {modal === "add" && (
        <Modal title="Add User" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => { e.preventDefault(); run(() => createUser(addForm), "Foydalanuvchi qo'shib bo'lmadi."); }}
            className="space-y-4"
          >
            <Field label="Full name">
              <input required value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className="modal-input" />
            </Field>
            <Field label="Email">
              <input required type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} className="modal-input" />
            </Field>
            <Field label="Temporary password (min 8)">
              <input required type="text" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} className="modal-input" placeholder="kamida 8 belgi" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Role">
                <select value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })} className="modal-input">
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Department">
                <select value={addForm.department} onChange={(e) => setAddForm({ ...addForm, department: e.target.value })} className="modal-input">
                  {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
            </div>
            <ModalActions loading={loading} onCancel={() => setModal(null)} submitLabel="Create User" />
          </form>
        </Modal>
      )}

      {/* Edit role */}
      {modal === "role" && target && (
        <Modal title={`Edit — ${target.name}`} onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => { e.preventDefault(); run(() => updateUserRole(target.id, roleForm.role, roleForm.department), "Rolni o'zgartirib bo'lmadi."); }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <Field label="Role">
                <select value={roleForm.role} onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })} className="modal-input">
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Department">
                <select value={roleForm.department} onChange={(e) => setRoleForm({ ...roleForm, department: e.target.value })} className="modal-input">
                  {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
            </div>
            <ModalActions loading={loading} onCancel={() => setModal(null)} submitLabel="Save" />
          </form>
        </Modal>
      )}

      {/* Module permissions */}
      {modal === "perms" && target && (
        <Modal title={`Permissions — ${target.name}`} onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => { e.preventDefault(); run(() => updateUserPermissions(target.id, Array.from(permSet)), "Ruxsatlarni saqlab bo'lmadi."); }}
            className="space-y-4"
          >
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
              Hech biri belgilanmasa — <strong className="text-fg">{target.department}</strong> bo&apos;limidagi barcha modullar ochiq.
              Muayyan modullar belgilansa — faqat o&apos;shalar bilan cheklanadi.
            </p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {(target.department === "FLEET" ? FLEET_MODULES : SAFETY_MODULES).map((m) => (
                <label key={m.key} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 cursor-pointer hover:bg-surface-2">
                  <input
                    type="checkbox"
                    checked={permSet.has(m.key)}
                    onChange={() => togglePerm(m.key)}
                    className="h-4 w-4 accent-blue-600"
                  />
                  <span className="text-sm font-medium text-fg">{m.label}</span>
                  <span className="ml-auto text-xs text-faint">{m.key}</span>
                </label>
              ))}
            </div>
            {target.department === "ADMIN" && (
              <p className="text-sm text-muted">Bu foydalanuvchi ADMIN bo&apos;limida — modul cheklovi qo&apos;llanmaydi.</p>
            )}
            <ModalActions loading={loading} onCancel={() => setModal(null)} submitLabel="Save Permissions" />
          </form>
        </Modal>
      )}

      {/* Reset password */}
      {modal === "reset" && target && (
        <Modal title={`Reset password — ${target.name}`} onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => { e.preventDefault(); run(() => adminResetPassword(target.id, newPassword), "Parolni tiklab bo'lmadi."); }}
            className="space-y-4"
          >
            <Field label="New password (min 8)">
              <input required type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="modal-input" placeholder="yangi vaqtinchalik parol" />
            </Field>
            <ModalActions loading={loading} onCancel={() => setModal(null)} submitLabel="Reset Password" />
          </form>
        </Modal>
      )}
    </div>
  );
}
