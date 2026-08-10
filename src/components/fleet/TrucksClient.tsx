"use client";

import { Modal } from "@/components/ui/profile";
import { showError } from "@/components/ui/toast";
import { useMemo, useState } from "react";
import Link from "next/link";
import { createTruck } from "@/app/actions/fleet";
import { Plus } from "lucide-react";
import type { TruckRow, AssignmentWithRefs } from "@/types/models";
import type { DeviceType } from "@prisma/client";
import { ExpiryDate, fmtDate, useDayStart } from "@/components/ui/expiry";
import { FilterButton, FilterDrawer, FilterField, FilterSelect, FilterDateRange } from "@/components/ui/filter-drawer";
import { useOpenOnNewParam } from "@/components/ui/use-new-param";

const VIEWS = [
  { key: "ALL", label: "All" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "UNASSIGNED", label: "Unassigned" },
  { key: "IN_SERVICE", label: "In Service" },
  { key: "HISTORY", label: "History" },
] as const;

const DRIVER_TYPE_LABELS: Record<string, string> = {
  COMPANY: "Company",
  OWNER_OPERATOR: "Owner Operator",
  LEASE_PURCHASE: "Lease Purchase",
};

const STATUS_STYLES: Record<string, string> = {
  ASSIGNED: "bg-blue-50 text-blue-700",
  UNASSIGNED: "bg-surface-2 text-muted",
  IN_SERVICE: "bg-amber-50 text-amber-700",
};

// TZ 4.2 jadval ustunlari — qurilma S/N lari Device.type bo'yicha topiladi.
const DEVICE_COLUMNS: { type: DeviceType; label: string }[] = [
  { type: "MOTIVE_GATEWAY", label: "Motive Gateway S/N" },
  { type: "CAMERA", label: "Camera S/N" },
  { type: "PREPASS", label: "PrePass #" },
  { type: "ELD_PT30", label: "ELD PT30 #" },
  { type: "TABLET", label: "Tablet #" },
  { type: "CHAINS", label: "Chains #" },
];

const OWNERSHIP_OPTIONS = [
  { value: "COMPANY", label: "Company" },
  { value: "LEASED", label: "Leased" },
  { value: "OWNER_OPERATOR", label: "Owner Operator" },
];

const STATUS_OPTIONS = [
  { value: "ASSIGNED", label: "Assigned" },
  { value: "UNASSIGNED", label: "Unassigned" },
  { value: "IN_SERVICE", label: "In Service" },
];

const DRIVER_TYPE_FILTER_OPTIONS = [
  { value: "COMPANY", label: "Company" },
  { value: "OWNER_OPERATOR", label: "Owner Operator" },
  { value: "LEASE_PURCHASE", label: "Lease Purchase" },
  { value: "NONE", label: "No driver assigned" },
];

const EXPIRY_OPTIONS = [
  { value: "EXPIRED", label: "Expired" },
  { value: "SOON", label: "Expiring within 30 days" },
  { value: "MISSING", label: "Not set" },
];

/** Bo'sh qiymatlar — "hammasi" degani. Faol filtrlar soni shu bo'yicha sanaladi. */
const emptyFilters = {
  status: "",
  ownership: "",
  driverType: "",
  location: "",
  make: "",
  device: "",
  registration: "",
  inspection: "",
  puFrom: "",
  puTo: "",
};

type Filters = typeof emptyFilters;

const DAY = 24 * 60 * 60 * 1000;

/** Muddat filtri — sana bo'yicha "expired / 30 kun ichida / yo'q". */
function matchesExpiry(date: Date | string | null, mode: string, nowDay: number) {
  if (!mode) return true;
  if (!date) return mode === "MISSING";
  const days = Math.ceil((new Date(date).getTime() - nowDay) / DAY);
  if (mode === "EXPIRED") return days < 0;
  if (mode === "SOON") return days >= 0 && days <= 30;
  return false; // MISSING, lekin sana bor
}

const emptyForm = () => ({
  unitNumber: "",
  vin: "",
  licensePlate: "",
  make: "",
  year: new Date().getFullYear().toString(),
  ownershipType: "COMPANY",
  location: "",
  registrationExpiry: "",
  annualInspectionDate: "",
  notes: "",
});

/** Truck'ning berilgan turdagi qurilmasi S/N i (yo'q bo'lsa "—"). */
function deviceSerial(truck: TruckRow, type: DeviceType) {
  const device = truck.devices.find((d) => d.type === type);
  if (!device) return "—";
  return device.serialNumber || device.name;
}

export function TrucksClient({ initialTrucks, history }: { initialTrucks: TruckRow[]; history: AssignmentWithRefs[] }) {
  const [trucks, setTrucks] = useState(initialTrucks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Dashboard tezkor amali (`?new=1`) bilan kelinganda modal o'zi ochiladi.
  useOpenOnNewParam(() => setIsModalOpen(true));
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<(typeof VIEWS)[number]["key"]>("ALL");
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState(emptyForm());

  // `filters` — qo'llangan holat, `draft` — panel ichida tahrirlanayotgani.
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeCount = Object.values(filters).filter((v) => v !== "").length;

  // Joylashuv va marka ro'yxatlari mavjud ma'lumotdan yig'iladi.
  const locationOptions = useMemo(
    () => [...new Set(trucks.map((t) => t.location).filter(Boolean))].sort().map((v) => ({ value: v, label: v })),
    [trucks],
  );
  const makeOptions = useMemo(
    () => [...new Set(trucks.map((t) => t.make).filter(Boolean))].sort().map((v) => ({ value: v, label: v })),
    [trucks],
  );

  const nowDay = useDayStart();

  const filtered = trucks.filter((t) => {
    if (view !== "ALL" && view !== "HISTORY" && t.status !== view) return false;

    const driver = t.assignments[0]?.driver;

    if (filters.status && t.status !== filters.status) return false;
    if (filters.ownership && t.ownershipType !== filters.ownership) return false;
    if (filters.location && t.location !== filters.location) return false;
    if (filters.make && t.make !== filters.make) return false;

    if (filters.driverType) {
      if (filters.driverType === "NONE") {
        if (driver) return false;
      } else if (driver?.driverType !== filters.driverType) return false;
    }

    if (filters.device && !t.devices.some((d) => d.type === filters.device)) return false;

    // Muddat filtrlari faqat hydration'dan keyin ishlaydi (vaqt kerak).
    if (nowDay !== null) {
      if (!matchesExpiry(t.registrationExpiry, filters.registration, nowDay)) return false;
      if (!matchesExpiry(t.annualInspectionDate, filters.inspection, nowDay)) return false;
    }

    const pickup = t.assignments[0]?.pickupDate;
    if (filters.puFrom && (!pickup || new Date(pickup) < new Date(filters.puFrom))) return false;
    if (filters.puTo && (!pickup || new Date(pickup) > new Date(`${filters.puTo}T23:59:59`))) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const haystack = [
      t.unitNumber, t.vin, t.licensePlate, t.make, t.location, t.notes ?? "",
      driver ? `${driver.firstName} ${driver.lastName}` : "",
      ...t.devices.map((d) => `${d.name} ${d.serialNumber ?? ""}`),
    ];
    return haystack.some((f) => f.toLowerCase().includes(q));
  });

  const filteredHistory = history.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const driverName = a.driver ? `${a.driver.firstName} ${a.driver.lastName}` : "";
    return [a.truck?.unitNumber ?? "", driverName, a.location ?? "", a.reason ?? ""].some((f) => f.toLowerCase().includes(q));
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await createTruck(formData);
      // createTruck relation'larsiz qaytaradi — ro'yxat uchun bo'sh massivlar qo'shamiz.
      setTrucks([{ ...created, assignments: [], devices: [] }, ...trucks]);
      setIsModalOpen(false);
      setFormData(emptyForm());
    } catch (error) {
      showError(error instanceof Error ? error.message : "Amaliyot bajarilmadi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Trucks</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4" />
          Add Truck
        </button>
      </div>

      {/* Views + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === v.key ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter unit, VIN, plate, driver, device…"
            className="rounded-lg border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <FilterButton
            activeCount={activeCount}
            onClick={() => { setDraft(filters); setDrawerOpen(true); }}
          />
        </div>
      </div>

      <FilterDrawer
        open={drawerOpen}
        activeCount={Object.values(draft).filter((v) => v !== "").length}
        onClose={() => setDrawerOpen(false)}
        onClear={() => setDraft(emptyFilters)}
        onApply={() => { setFilters(draft); setDrawerOpen(false); }}
      >
        <FilterField label="Status">
          <FilterSelect value={draft.status} onChange={(v) => setDraft({ ...draft, status: v })}
            allLabel="All statuses" options={STATUS_OPTIONS} />
        </FilterField>
        <FilterField label="Driver Type">
          <FilterSelect value={draft.driverType} onChange={(v) => setDraft({ ...draft, driverType: v })}
            allLabel="All driver types" options={DRIVER_TYPE_FILTER_OPTIONS} />
        </FilterField>
        <FilterField label="Ownership">
          <FilterSelect value={draft.ownership} onChange={(v) => setDraft({ ...draft, ownership: v })}
            allLabel="All ownership types" options={OWNERSHIP_OPTIONS} />
        </FilterField>
        <FilterField label="Home Location">
          <FilterSelect value={draft.location} onChange={(v) => setDraft({ ...draft, location: v })}
            allLabel="All locations" options={locationOptions} />
        </FilterField>
        <FilterField label="Make">
          <FilterSelect value={draft.make} onChange={(v) => setDraft({ ...draft, make: v })}
            allLabel="All makes" options={makeOptions} />
        </FilterField>
        <FilterField label="Has Device">
          <FilterSelect value={draft.device} onChange={(v) => setDraft({ ...draft, device: v })}
            allLabel="Any device" options={DEVICE_COLUMNS.map((c) => ({ value: c.type, label: c.label.replace(/ (S\/N|#)$/, "") }))} />
        </FilterField>
        <FilterField label="Registration Expiry">
          <FilterSelect value={draft.registration} onChange={(v) => setDraft({ ...draft, registration: v })}
            allLabel="Any registration status" options={EXPIRY_OPTIONS} />
        </FilterField>
        <FilterField label="Annual Inspection">
          <FilterSelect value={draft.inspection} onChange={(v) => setDraft({ ...draft, inspection: v })}
            allLabel="Any inspection status" options={EXPIRY_OPTIONS} />
        </FilterField>
        <FilterDateRange
          label="Pickup Date"
          from={draft.puFrom} to={draft.puTo}
          onFrom={(v) => setDraft({ ...draft, puFrom: v })}
          onTo={(v) => setDraft({ ...draft, puTo: v })}
        />
      </FilterDrawer>

      {/* History view (TZ 4.2): yopilgan biriktiruvlar tarixi */}
      {view === "HISTORY" ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-muted">
              <thead className="border-b border-border bg-surface-2/70">
                <tr>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Unit #</th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Driver</th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Pickup</th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Dropoff</th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Location</th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredHistory.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted">No history records.</td></tr>
                ) : (
                  filteredHistory.map((a) => (
                    <tr key={a.id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-5 py-3.5 sm:px-6 font-medium">
                        {a.truck ? (
                          <Link href={`/fleet/trucks/${a.truck.id}`} className="text-blue-600 hover:underline">{a.truck.unitNumber}</Link>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-3.5 sm:px-6">{a.driver ? `${a.driver.firstName} ${a.driver.lastName}` : "—"}</td>
                      <td className="px-5 py-3.5 sm:px-6">{fmtDate(a.pickupDate)}</td>
                      <td className="px-5 py-3.5 sm:px-6">{fmtDate(a.dropoffDate)}</td>
                      <td className="px-5 py-3.5 sm:px-6">{a.location ?? "—"}</td>
                      <td className="px-5 py-3.5 sm:px-6">{a.reason ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-muted whitespace-nowrap">
              <thead className="border-b border-border bg-surface-2/70">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Unit #</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">VIN</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Plate</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Driver</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Driver Type</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Make</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Year</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Status</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">PU Date</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Notes</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Home Location</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Reg. Exp.</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Insp. Year</th>
                  {DEVICE_COLUMNS.map((c) => (
                    <th key={c.type} className="px-4 py-3 font-medium">{c.label}</th>
                  ))}
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={20} className="px-6 py-8 text-center text-muted">No trucks found.</td>
                  </tr>
                ) : (
                  filtered.map((truck) => {
                    const assignment = truck.assignments[0];
                    const driver = assignment?.driver;
                    return (
                      <tr key={truck.id} className="hover:bg-surface-2 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          <Link href={`/fleet/trucks/${truck.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                            {truck.unitNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{truck.vin}</td>
                        <td className="px-4 py-3">{truck.licensePlate}</td>
                        <td className="px-4 py-3">
                          {driver ? (
                            <Link href={`/safety/drivers/${driver.id}`} className="text-blue-600 hover:underline">
                              {driver.firstName} {driver.lastName}
                            </Link>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">{driver ? DRIVER_TYPE_LABELS[driver.driverType] ?? driver.driverType : "—"}</td>
                        <td className="px-4 py-3">{truck.make}</td>
                        <td className="px-4 py-3">{truck.year}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLES[truck.status] ?? "bg-surface-2 text-muted"}`}>
                            {truck.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">{fmtDate(assignment?.pickupDate)}</td>
                        <td className="px-4 py-3 max-w-[200px] truncate whitespace-normal" title={truck.notes ?? ""}>
                          {truck.notes || "—"}
                        </td>
                        <td className="px-4 py-3">{truck.location}</td>
                        <td className="px-4 py-3"><ExpiryDate date={truck.registrationExpiry} /></td>
                        <td className="px-4 py-3"><ExpiryDate date={truck.annualInspectionDate} /></td>
                        {DEVICE_COLUMNS.map((c) => (
                          <td key={c.type} className="px-4 py-3 font-mono text-xs">{deviceSerial(truck, c.type)}</td>
                        ))}
                        <td className="px-4 py-3">
                          <Link href={`/fleet/trucks/${truck.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add truck modal */}
      {isModalOpen && (
        <Modal title="Add New Truck" size="lg" onClose={() => setIsModalOpen(false)}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Unit Number</label>
                  <input required className="modal-input"
                    value={formData.unitNumber} onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">VIN</label>
                  <input required className="modal-input"
                    value={formData.vin} onChange={(e) => setFormData({ ...formData, vin: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Make</label>
                  <input required className="modal-input"
                    value={formData.make} onChange={(e) => setFormData({ ...formData, make: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Year</label>
                  <input required type="number" className="modal-input"
                    value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">License Plate</label>
                  <input required className="modal-input"
                    value={formData.licensePlate} onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Ownership Type</label>
                  <select className="modal-input"
                    value={formData.ownershipType} onChange={(e) => setFormData({ ...formData, ownershipType: e.target.value })}>
                    <option value="COMPANY">Company</option>
                    <option value="LEASED">Leased</option>
                    <option value="OWNER_OPERATOR">Owner Operator</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Registration Expiry</label>
                  <input type="date" className="modal-input"
                    value={formData.registrationExpiry} onChange={(e) => setFormData({ ...formData, registrationExpiry: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Annual Inspection</label>
                  <input type="date" className="modal-input"
                    value={formData.annualInspectionDate} onChange={(e) => setFormData({ ...formData, annualInspectionDate: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-fg">Home Location</label>
                  <input required className="modal-input"
                    value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
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
                  {loading ? "Saving..." : "Save Truck"}
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
