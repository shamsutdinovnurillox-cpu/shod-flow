"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { showError } from "@/components/ui/toast";
import { updateDevice, deleteDevice } from "@/app/actions/devices";
import { Modal, ModalActions, DetailPanel, Row, InfoCard } from "@/components/ui/profile";
import { ArrowLeft, Cpu, Truck as TruckIcon, CalendarClock, Wrench } from "lucide-react";
import type { DeviceProfile, Truck } from "@/types/models";
import {
  ConditionBadge, DeviceFormFields, deviceToForm, typeLabel, ChangeTruckModal, type DeviceForm,
} from "@/components/fleet/device-ui";
import { ExpiryDate, fmtDate, useDayStart } from "@/components/ui/expiry";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Biriktiruv davomiyligi kunlarda. Faol biriktiruv uchun "hozir" kerak, u esa
 * render ichida olinmaydi (nopok + SSR mismatch) — shuning uchun `now`
 * useDayStart() dan keladi va hydration'gacha null bo'ladi.
 */
function duration(installedAt: Date | string, removedAt: Date | string | null, now: number | null) {
  const end = removedAt ? new Date(removedAt).getTime() : now;
  if (end === null) return "—";
  const days = Math.max(0, Math.round((end - new Date(installedAt).getTime()) / DAY));
  return `${days}d`;
}

export function DeviceProfileClient({ device, trucks }: { device: DeviceProfile; trucks: Truck[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<null | "edit" | "move">(null);
  const [form, setForm] = useState<DeviceForm>(deviceToForm(device));
  const [loading, setLoading] = useState(false);

  const patchForm = (patch: Partial<DeviceForm>) => setForm((f) => ({ ...f, ...patch }));
  const active = device.assignments.find((a) => a.isActive);
  const now = useDayStart();

  const openEdit = () => {
    setForm(deviceToForm(device));
    setModal("edit");
  };

  const onEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDevice(device.id, form);
      setModal(null);
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Saqlashda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!confirm(`Delete device "${device.name}"? Its history will be removed too.`)) return;
    try {
      await deleteDevice(device.id);
      router.push("/fleet/devices");
    } catch (err) {
      showError(err instanceof Error ? err.message : "O'chirishda xatolik.");
    }
  };

  return (
    <div className="space-y-8">
      <Link href="/fleet/devices" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Back to Devices
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-purple-100 p-3 text-purple-600"><Cpu className="h-8 w-8" /></div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-fg">{device.name}</h1>
            <p className="text-muted">
              {typeLabel(device.type)}
              {device.serialNumber && <> · <span className="font-mono text-sm">{device.serialNumber}</span></>}
            </p>
          </div>
          <ConditionBadge condition={device.condition} />
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setModal("move")} className="btn btn-primary">Change Truck</button>
          <button onClick={openEdit} className="btn btn-secondary">Edit</button>
          <button onClick={onDelete} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">Delete</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={TruckIcon} color="bg-blue-100 text-blue-600" label="Current Truck" value={device.truck?.unitNumber ?? "In stock"} />
        <InfoCard icon={CalendarClock} color="bg-emerald-100 text-emerald-600" label="Installed On" value={active ? fmtDate(active.installedAt) : "—"} />
        <InfoCard icon={Wrench} color="bg-amber-100 text-amber-600" label="Time On Truck" value={active ? duration(active.installedAt, null, now) : "—"} />
        <InfoCard icon={Cpu} color="bg-purple-100 text-purple-600" label="Total Moves" value={String(device.assignments.length)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DetailPanel title="Device Details">
          <Row k="Type" v={typeLabel(device.type)} />
          <Row k="Serial Number" v={device.serialNumber || "—"} />
          <Row k="VIN Number" v={device.vin || "—"} />
          <Row k="Expiry" v={<ExpiryDate date={device.expiryDate} />} />
          <Row k="Condition" v={<ConditionBadge condition={device.condition} />} />
          <Row k="Notes" v={device.notes || "—"} />
        </DetailPanel>

        <DetailPanel title="Current Assignment">
          {active ? (
            <>
              <Row
                k="Truck"
                v={
                  active.truck ? (
                    <Link href={`/fleet/trucks/${active.truck.id}`} className="text-blue-600 hover:underline">
                      {active.truck.unitNumber}
                    </Link>
                  ) : "—"
                }
              />
              <Row k="Installed" v={fmtDate(active.installedAt)} />
              <Row k="Duration" v={duration(active.installedAt, null, now)} />
              <Row k="Truck VIN" v={active.truck?.vin ?? "—"} />
            </>
          ) : (
            <p className="py-4 text-sm text-muted">Not installed on any truck — currently in stock.</p>
          )}
        </DetailPanel>
      </div>

      <div className="card overflow-hidden">
        <h2 className="px-6 pt-6 pb-3 text-lg font-bold text-fg">Assignment History ({device.assignments.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted whitespace-nowrap">
            <thead className="border-b border-border bg-surface-2/70">
              <tr>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Truck</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Installed</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Removed</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Duration</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Status</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {device.assignments.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-6 text-center text-muted">Never installed on a truck.</td></tr>
              ) : (
                device.assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-surface-2">
                    <td className="px-5 py-3 sm:px-6 font-medium">
                      {a.truck ? (
                        <Link href={`/fleet/trucks/${a.truck.id}`} className="text-blue-600 hover:underline">{a.truck.unitNumber}</Link>
                      ) : <span className="text-faint">In stock</span>}
                    </td>
                    <td className="px-5 py-3 sm:px-6">{fmtDate(a.installedAt)}</td>
                    <td className="px-5 py-3 sm:px-6">{a.removedAt ? fmtDate(a.removedAt) : "—"}</td>
                    <td className="px-5 py-3 sm:px-6">{duration(a.installedAt, a.removedAt, now)}</td>
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

      {modal === "edit" && (
        <Modal title="Edit Device" onClose={() => setModal(null)}>
          <form onSubmit={onEdit} className="space-y-4">
            <DeviceFormFields form={form} onChange={patchForm} />
            <p className="text-xs text-muted">Truck is changed with the “Change Truck” action so the history keeps its dates.</p>
            <ModalActions loading={loading} onCancel={() => setModal(null)} submitLabel="Save" />
          </form>
        </Modal>
      )}

      {modal === "move" && (
        <ChangeTruckModal
          device={device}
          trucks={trucks}
          onClose={() => setModal(null)}
          onMoved={() => router.refresh()}
        />
      )}
    </div>
  );
}
