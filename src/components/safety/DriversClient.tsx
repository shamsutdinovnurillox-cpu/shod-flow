"use client";

import { Modal } from "@/components/ui/profile";
import { showError } from "@/components/ui/toast";
import { useMemo, useState } from "react";
import Link from "next/link";
import { createDriver } from "@/app/actions/safety";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import type { Driver } from "@/types/models";
import { ExpiryDate, fmtDate, StatCard } from "@/components/ui/expiry";
import { useOpenOnNewParam } from "@/components/ui/use-new-param";

const today = () => new Date().toISOString().split("T")[0];

export const DRIVER_TYPE_OPTIONS = [
  { value: "COMPANY", label: "Company" },
  { value: "OWNER_OPERATOR", label: "Owner Operator" },
  { value: "LEASE_PURCHASE", label: "Lease Purchase" },
] as const;

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "ON_LEAVE", label: "On Leave" },
  { value: "TERMINATED", label: "Terminated" },
] as const;

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "border-emerald-300 text-emerald-600",
  ON_LEAVE: "border-amber-300 text-amber-600",
  TERMINATED: "border-border text-muted",
};

const STATUS_DOTS: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  ON_LEAVE: "bg-amber-500",
  TERMINATED: "bg-faint",
};

function StatusPill({ status }: { status: string }) {
  const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status] ?? "border-border text-muted"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[status] ?? "bg-faint"}`} />
      {label}
    </span>
  );
}

const emptyForm = () => ({
  firstName: "",
  lastName: "",
  dob: "",
  cdlNumber: "",
  cdlState: "",
  cdlIssueDate: "",
  cdlExpiryDate: today(),
  medCardExpiryDate: today(),
  hireDate: today(),
  driverType: "COMPANY",
  notes: "",
});

export function DriversClient({ initialDrivers }: { initialDrivers: Driver[] }) {
  const [drivers, setDrivers] = useState(initialDrivers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Dashboard tezkor amali (`?new=1`) bilan kelinganda modal o'zi ochiladi.
  useOpenOnNewParam(() => setIsModalOpen(true));
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const counts = useMemo(
    () => ({
      total: drivers.length,
      active: drivers.filter((d) => d.status === "ACTIVE").length,
      onLeave: drivers.filter((d) => d.status === "ON_LEAVE").length,
      terminated: drivers.filter((d) => d.status === "TERMINATED").length,
    }),
    [drivers],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drivers.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (!q) return true;
      return `${d.firstName} ${d.lastName} ${d.cdlNumber} ${d.cdlState}`.toLowerCase().includes(q);
    });
  }, [drivers, search, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newDriver = await createDriver(formData);
      setDrivers([newDriver, ...drivers]);
      setIsModalOpen(false);
      setFormData(emptyForm());
    } catch (error) {
      showError(error instanceof Error ? error.message : "Haydovchini qo'shishda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Drivers</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4" />
          Add Driver
        </button>
      </div>

      {/* KPI kartalar */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Drivers" value={counts.total} />
        <StatCard label="Active" value={counts.active} tone="green" />
        <StatCard label="On Leave" value={counts.onLeave} tone="amber" />
        <StatCard label="Terminated" value={counts.terminated} tone="muted" />
      </div>

      {/* Filtrlar */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, CDL #, state…"
              className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-blue-500 focus:outline-none sm:w-52"
          >
            <option value="all">all</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted whitespace-nowrap">
            <thead className="border-b border-border bg-surface-2/70">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Name</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Status</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Driver Type</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Date of Birth</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">CDL Number</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">CDL State</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">CDL Issue</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">CDL Expiration</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Medical Expiration</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Hiring Date</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Termination Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-8 text-center text-muted">
                    {drivers.length === 0 ? "No drivers found." : "No drivers match the filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((driver) => (
                  <tr key={driver.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/safety/drivers/${driver.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {driver.firstName} {driver.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><StatusPill status={driver.status} /></td>
                    <td className="px-4 py-3">
                      {DRIVER_TYPE_OPTIONS.find((t) => t.value === driver.driverType)?.label ?? driver.driverType}
                    </td>
                    <td className="px-4 py-3">{fmtDate(driver.dob)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{driver.cdlNumber}</td>
                    <td className="px-4 py-3">{driver.cdlState}</td>
                    <td className="px-4 py-3">{fmtDate(driver.cdlIssueDate)}</td>
                    <td className="px-4 py-3"><ExpiryDate date={driver.cdlExpiryDate} /></td>
                    <td className="px-4 py-3"><ExpiryDate date={driver.medCardExpiryDate} /></td>
                    <td className="px-4 py-3">{fmtDate(driver.hireDate)}</td>
                    <td className="px-4 py-3">{fmtDate(driver.terminationDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <Modal title="Add Driver" size="lg" onClose={() => setIsModalOpen(false)}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">First Name</label>
                  <input required className="modal-input"
                    value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Last Name</label>
                  <input required className="modal-input"
                    value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Driver Type</label>
                  <select className="modal-input"
                    value={formData.driverType} onChange={(e) => setFormData({ ...formData, driverType: e.target.value })}>
                    {DRIVER_TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Date of Birth</label>
                  <input required type="date" className="modal-input"
                    value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Hire Date</label>
                  <input required type="date" className="modal-input"
                    value={formData.hireDate} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">CDL Number</label>
                  <input required className="modal-input"
                    value={formData.cdlNumber} onChange={(e) => setFormData({ ...formData, cdlNumber: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">CDL State</label>
                  <input required className="modal-input"
                    value={formData.cdlState} onChange={(e) => setFormData({ ...formData, cdlState: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">CDL Issue Date</label>
                  <input required type="date" className="modal-input"
                    value={formData.cdlIssueDate} onChange={(e) => setFormData({ ...formData, cdlIssueDate: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">CDL Expiry</label>
                  <input required type="date" className="modal-input"
                    value={formData.cdlExpiryDate} onChange={(e) => setFormData({ ...formData, cdlExpiryDate: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Medical Card Expiry</label>
                  <input required type="date" className="modal-input"
                    value={formData.medCardExpiryDate} onChange={(e) => setFormData({ ...formData, medCardExpiryDate: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-fg">Notes</label>
                  <input className="modal-input"
                    value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? "Saving..." : "Save Driver"}
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
