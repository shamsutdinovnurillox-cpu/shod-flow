"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { showError } from "@/components/ui/toast";
import { createDevice, updateDevice, deleteDevice } from "@/app/actions/devices";
import { Modal, ModalActions } from "@/components/ui/profile";
import { Plus, ArrowLeftRight } from "lucide-react";
import type { DeviceWithTruck, Truck } from "@/types/models";
import {
  CONDITION_OPTIONS, TYPE_OPTIONS, typeLabel, ConditionBadge, ExpiryCell, DeviceFormFields,
  emptyDeviceForm, deviceToForm, ChangeTruckModal, ActionButton, type DeviceForm,
} from "@/components/fleet/device-ui";

/** Barcha qurilmalar reyestri — truck'dan mustaqil, alohida sahifa. */
export function DevicesClient({
  initialDevices,
  trucks,
}: {
  initialDevices: DeviceWithTruck[];
  trucks: Truck[];
}) {
  const [devices, setDevices] = useState(initialDevices);
  const [modal, setModal] = useState<null | "add" | "edit">(null);
  const [editing, setEditing] = useState<DeviceWithTruck | null>(null);
  // Change Truck oqimi: sarlavhadagi tugma avval qurilma tanlatadi.
  const [moving, setMoving] = useState<DeviceWithTruck | null>(null);
  const [pickingMove, setPickingMove] = useState(false);
  const [form, setForm] = useState<DeviceForm>(emptyDeviceForm());
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [truckFilter, setTruckFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const patchForm = (patch: Partial<DeviceForm>) => setForm((f) => ({ ...f, ...patch }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devices.filter((d) => {
      if (q && !`${d.name} ${d.serialNumber ?? ""} ${d.vin ?? ""} ${d.truck?.unitNumber ?? ""}`.toLowerCase().includes(q)) return false;
      if (typeFilter && d.type !== typeFilter) return false;
      if (truckFilter === "UNASSIGNED" ? d.truckId !== null : truckFilter && d.truckId !== truckFilter) return false;
      if (conditionFilter && d.condition !== conditionFilter) return false;
      return true;
    });
  }, [devices, search, truckFilter, conditionFilter, typeFilter]);

  const openAdd = () => {
    setForm(emptyDeviceForm({ name: "Motive Gateway" }));
    setModal("add");
  };

  const openEdit = (device: DeviceWithTruck) => {
    setForm(deviceToForm(device));
    setEditing(device);
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditing(null);
  };

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await createDevice(form);
      setDevices((prev) => [created, ...prev]);
      closeModal();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Qurilma qo'shilmadi.");
    } finally {
      setLoading(false);
    }
  };

  const onEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setLoading(true);
    try {
      const updated = await updateDevice(editing.id, form);
      setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      closeModal();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Saqlashda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (device: DeviceWithTruck) => {
    if (!confirm(`Delete device "${device.name}"?`)) return;
    try {
      await deleteDevice(device.id);
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
    } catch (err) {
      showError(err instanceof Error ? err.message : "O'chirishda xatolik.");
    }
  };

  const onMoved = (updated: DeviceWithTruck) => {
    setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setMoving(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devices"
        actions={
          <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setPickingMove(true)}
            className="flex items-center gap-2 btn btn-secondary"
          >
            <ArrowLeftRight className="h-4 w-4" />
            Change Truck
          </button>
          <button
            onClick={openAdd}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4" />
            Add Device
          </button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3">
        <input
          placeholder="Search name, VIN or unit…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="modal-input max-w-xs"
        />
        <select value={truckFilter} onChange={(e) => setTruckFilter(e.target.value)} className="modal-input max-w-[200px]">
          <option value="">All trucks</option>
          <option value="UNASSIGNED">Unassigned (in stock)</option>
          {trucks.map((t) => <option key={t.id} value={t.id}>{t.unitNumber}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="modal-input max-w-[180px]">
          <option value="">All types</option>
          {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} className="modal-input max-w-[180px]">
          <option value="">All conditions</option>
          {CONDITION_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="border-b border-border bg-surface-2/70">
              <tr>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Name</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Type</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">S/N</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">VIN Number</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Truck</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Expiry</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Condition</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted">
                    {devices.length === 0 ? "No devices yet." : "No devices match the filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-5 py-3.5 sm:px-6 font-medium">
                      <Link href={`/fleet/devices/${d.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {d.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 sm:px-6">{typeLabel(d.type)}</td>
                    <td className="px-5 py-3.5 sm:px-6 font-mono text-xs">{d.serialNumber || "—"}</td>
                    <td className="px-5 py-3.5 sm:px-6">{d.vin || "—"}</td>
                    <td className="px-5 py-3.5 sm:px-6">
                      {d.truck ? (
                        <Link href={`/fleet/trucks/${d.truck.id}`} className="text-blue-600 hover:underline">
                          {d.truck.unitNumber}
                        </Link>
                      ) : (
                        <span className="text-faint">In stock</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 sm:px-6"><ExpiryCell date={d.expiryDate} /></td>
                    <td className="px-5 py-3.5 sm:px-6"><ConditionBadge condition={d.condition} /></td>
                    <td className="px-5 py-3.5 sm:px-6">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton tone="primary" onClick={() => setMoving(d)}>Move</ActionButton>
                        <ActionButton onClick={() => openEdit(d)}>Edit</ActionButton>
                        <ActionButton tone="danger" onClick={() => onDelete(d)}>Delete</ActionButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={modal === "add" ? "Add Device" : "Edit Device"} onClose={closeModal}>
          <form onSubmit={modal === "add" ? onAdd : onEdit} className="space-y-4">
            <DeviceFormFields form={form} onChange={patchForm} trucks={modal === "add" ? trucks : undefined} showInstalledAt={modal === "add"} />
            {modal === "edit" && (
              <p className="text-xs text-muted">Use “Move” to change the truck — that records the dates in history.</p>
            )}
            <ModalActions loading={loading} onCancel={closeModal} submitLabel={modal === "add" ? "Add Device" : "Save"} />
          </form>
        </Modal>
      )}

      {/* Sarlavhadagi "Change Truck" — avval qaysi qurilma ekanini tanlaymiz. */}
      {pickingMove && (
        <Modal title="Change Truck — pick a device" onClose={() => setPickingMove(false)}>
          {devices.length === 0 ? (
            <p className="py-4 text-sm text-muted">No devices yet.</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
              {devices.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => { setPickingMove(false); setMoving(d); }}
                    className="flex w-full items-center justify-between gap-3 px-1 py-3 text-left text-sm hover:bg-surface-2"
                  >
                    <span>
                      <span className="block font-medium text-fg">{d.name}</span>
                      <span className="block text-xs text-muted">
                        {typeLabel(d.type)}{d.serialNumber ? ` · ${d.serialNumber}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {d.truck ? d.truck.unitNumber : "In stock"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {moving && (
        <ChangeTruckModal
          device={moving}
          trucks={trucks}
          onClose={() => setMoving(null)}
          onMoved={onMoved}
        />
      )}
    </div>
  );
}
