"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { showError } from "@/components/ui/toast";
import { createDevice } from "@/app/actions/devices";
import { Modal, ModalActions } from "@/components/ui/profile";
import { Plus, MapPin, ExternalLink, History } from "lucide-react";
import type { DeviceWithTruck, DeviceAssignmentRow } from "@/types/models";
import type { DeviceType } from "@prisma/client";
import { DeviceFormFields, emptyDeviceForm, typeLabel, type DeviceForm } from "@/components/fleet/device-ui";
import { fmtDate } from "@/components/ui/expiry";

// TZ 4.2 dagi qurilma turlari — har biri o'z ustuniga tushadi.
const DEVICE_COLUMNS: { type: DeviceType; label: string }[] = [
  { type: "MOTIVE_GATEWAY", label: "Motive Gateway S/N" },
  { type: "CAMERA", label: "Camera S/N" },
  { type: "PREPASS", label: "PrePass #" },
  { type: "ELD_PT30", label: "ELD PT30 #" },
  { type: "TABLET", label: "Tablet #" },
  { type: "CHAINS", label: "Chains #" },
];

/**
 * Truck profilidagi "Device Assignment" paneli: har bir qurilma turi bitta
 * ustun, katakda esa o'sha turdagi qurilmaning S/N i. Katak bosilganda
 * qurilma detali ochiladi.
 */
export function DeviceAssignmentPanel({
  truckId,
  truckVin,
  initialDevices,
}: {
  truckId: string;
  truckVin: string;
  initialDevices: DeviceWithTruck[];
}) {
  const router = useRouter();
  const [devices, setDevices] = useState(initialDevices);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<DeviceForm>(emptyDeviceForm());
  const [loading, setLoading] = useState(false);

  const patchForm = (patch: Partial<DeviceForm>) => setForm((f) => ({ ...f, ...patch }));

  const openAdd = () => {
    // Yangi qurilma shu truck'ga biriktiriladi, VIN truck VIN'i bilan to'ldiriladi.
    setForm(emptyDeviceForm({ truckId, vin: truckVin, name: "Motive Gateway" }));
    setAdding(true);
  };

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await createDevice({ ...form, truckId });
      setDevices((prev) => [created, ...prev]);
      setAdding(false);
      router.refresh(); // tarix jadvali ham yangilansin
    } catch (err) {
      showError(err instanceof Error ? err.message : "Qurilma qo'shilmadi.");
    } finally {
      setLoading(false);
    }
  };

  /** Ustundagi qurilmalar — bir turdan bir nechta bo'lishi mumkin. */
  const devicesOfType = (type: DeviceType) => devices.filter((d) => d.type === type);

  const untyped = devices.filter((d) => !DEVICE_COLUMNS.some((c) => c.type === d.type));

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-surface-2 p-2.5 text-muted">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-fg">Device Assignment</h2>
            <p className="text-sm text-muted">Current equipment installed on this truck.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/fleet/devices" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
            All devices <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Device
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border-t border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-2/70">
            <tr>
              {DEVICE_COLUMNS.map((c) => (
                <th key={c.type} className="whitespace-nowrap px-6 py-3 text-xs font-semibold uppercase tracking-wider">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {DEVICE_COLUMNS.map((c) => {
                const matches = devicesOfType(c.type);
                return (
                  <td key={c.type} className="whitespace-nowrap border-t border-border px-6 py-4 font-mono text-xs">
                    {matches.length === 0 ? (
                      <span className="text-faint">—</span>
                    ) : (
                      <span className="flex flex-col gap-1">
                        {matches.map((d) => (
                          <Link key={d.id} href={`/fleet/devices/${d.id}`} className="text-blue-600 hover:underline">
                            {d.serialNumber || d.name}
                          </Link>
                        ))}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Standart ustunlarga tushmaydigan qurilmalar (type = Other) */}
      {untyped.length > 0 && (
        <div className="border-t border-border px-6 py-3 text-sm">
          <span className="text-muted">Other: </span>
          {untyped.map((d, i) => (
            <span key={d.id}>
              {i > 0 && ", "}
              <Link href={`/fleet/devices/${d.id}`} className="text-blue-600 hover:underline">
                {d.name}{d.serialNumber ? ` (${d.serialNumber})` : ""}
              </Link>
            </span>
          ))}
        </div>
      )}

      {adding && (
        <Modal title="Add Device" onClose={() => setAdding(false)}>
          <form onSubmit={onAdd} className="space-y-4">
            <DeviceFormFields form={form} onChange={patchForm} showInstalledAt />
            <ModalActions loading={loading} onCancel={() => setAdding(false)} submitLabel="Add Device" />
          </form>
        </Modal>
      )}
    </div>
  );
}

/** Truck profilidagi qurilma tarixi: nima o'rnatilgan, qachon yechilgan. */
export function DeviceHistoryPanel({ assignments }: { assignments: DeviceAssignmentRow[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 p-6 pb-4">
        <div className="rounded-lg bg-surface-2 p-2.5 text-muted">
          <History className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-fg">Device History ({assignments.length})</h2>
          <p className="text-sm text-muted">Every device this truck has carried, with dates.</p>
        </div>
      </div>

      <div className="overflow-x-auto border-t border-border">
        <table className="w-full text-left text-sm text-muted whitespace-nowrap">
          <thead className="border-b border-border bg-surface-2/70">
            <tr>
              <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Device</th>
              <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Type</th>
              <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">S/N</th>
              <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Installed</th>
              <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Removed</th>
              <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Status</th>
              <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assignments.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-6 text-center text-muted">No device history yet.</td></tr>
            ) : (
              assignments.map((a) => (
                <tr key={a.id} className="hover:bg-surface-2">
                  <td className="px-5 py-3 sm:px-6 font-medium">
                    <Link href={`/fleet/devices/${a.device.id}`} className="text-blue-600 hover:underline">
                      {a.device.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 sm:px-6">{typeLabel(a.device.type)}</td>
                  <td className="px-5 py-3 sm:px-6 font-mono text-xs">{a.device.serialNumber || "—"}</td>
                  <td className="px-5 py-3 sm:px-6">{fmtDate(a.installedAt)}</td>
                  <td className="px-5 py-3 sm:px-6">{a.removedAt ? fmtDate(a.removedAt) : "—"}</td>
                  <td className="px-5 py-3 sm:px-6">
                    {a.isActive ? (
                      <span className="inline-flex rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">Installed</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-surface-2 px-2 py-1 text-xs font-semibold text-muted">Removed</span>
                    )}
                  </td>
                  <td className="px-5 py-3 sm:px-6">{a.notes || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
