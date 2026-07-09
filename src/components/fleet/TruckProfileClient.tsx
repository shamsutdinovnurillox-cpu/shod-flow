"use client";

import { showError } from "@/components/ui/toast";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assignTruck, moveTruck, updateTruck } from "@/app/actions/fleet";
import type { TruckProfile, Driver } from "@/types/models";
import { ArrowLeft, Truck, User, MapPin, Wrench, DollarSign } from "lucide-react";
import { money, InfoCard, DetailPanel, Row, HistoryTable, Modal, Field, ModalActions } from "@/components/ui/profile";

const today = () => new Date().toISOString().split("T")[0];

const STATUS_STYLES: Record<string, string> = {
  ASSIGNED: "bg-blue-50 text-blue-700",
  UNASSIGNED: "bg-surface-2 text-muted",
  IN_SERVICE: "bg-yellow-50 text-yellow-700",
};

export function TruckProfileClient({ truck, drivers }: { truck: TruckProfile; drivers: Driver[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<null | "assign" | "move" | "edit">(null);
  const [loading, setLoading] = useState(false);

  const activeAssignment = truck.assignments.find((a) => a.isActive);
  const currentDriver = activeAssignment?.driver;

  const serviceCost = truck.services.reduce((s, x) => s + (x.cost ?? 0), 0);
  const expenseCost = truck.expenses.reduce((s, x) => s + x.amount, 0);

  const [assignForm, setAssignForm] = useState({ driverId: drivers[0]?.id ?? "", pickupDate: today() });
  const [moveForm, setMoveForm] = useState({ mode: "DROP_YARD", location: "", reason: "", notes: "" });
  const [editForm, setEditForm] = useState({
    unitNumber: truck.unitNumber,
    vin: truck.vin,
    licensePlate: truck.licensePlate,
    make: truck.make,
    year: String(truck.year),
    ownershipType: truck.ownershipType,
    location: truck.location,
    notes: truck.notes ?? "",
    motiveGateway: truck.motiveGateway ?? "",
    camera: truck.camera ?? "",
    prePass: truck.prePass ?? "",
    eldPt30: truck.eldPt30 ?? "",
    tablet: truck.tablet ?? "",
    chains: truck.chains,
  });

  const onEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateTruck(truck.id, editForm);
      setModal(null);
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Saqlashda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  const onAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await assignTruck({ truckId: truck.id, driverId: assignForm.driverId, pickupDate: assignForm.pickupDate });
      setModal(null);
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Biriktirishda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  const onMove = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await moveTruck({ truckId: truck.id, mode: moveForm.mode as "DROP_YARD" | "DROP_SERVICE" | "SERVICE_HOME", location: moveForm.location, reason: moveForm.reason, notes: moveForm.notes });
      setModal(null);
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "O'zgartirishda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Link href="/fleet/trucks" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Back to Trucks
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Truck className="h-8 w-8" /></div>
          <div>
            <h1 className="text-3xl font-bold text-fg">{truck.unitNumber}</h1>
            <p className="text-muted">{truck.make} · {truck.year} · {truck.ownershipType}</p>
          </div>
          <span className={`ml-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[truck.status] ?? "bg-surface-2 text-muted"}`}>
            {truck.status}
          </span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setModal("assign")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Assign Driver</button>
          <button onClick={() => setModal("move")} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2">Move / Drop</button>
          <button onClick={() => setModal("edit")} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2">Edit</button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <InfoCard icon={User} color="bg-emerald-100 text-emerald-600" label="Current Driver" value={currentDriver ? `${currentDriver.firstName} ${currentDriver.lastName}` : "—"} />
        <InfoCard icon={MapPin} color="bg-indigo-100 text-indigo-600" label="Location" value={truck.location} />
        <InfoCard icon={Wrench} color="bg-yellow-100 text-yellow-600" label="Service Cost" value={money(serviceCost)} />
        <InfoCard icon={DollarSign} color="bg-teal-100 text-teal-600" label="Combined Cost" value={money(serviceCost + expenseCost)} />
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DetailPanel title="Vehicle Details">
          <Row k="VIN" v={truck.vin} />
          <Row k="License Plate" v={truck.licensePlate} />
          <Row k="Ownership" v={truck.ownershipType} />
          <Row k="Devices" v={[truck.motiveGateway && "Motive", truck.camera && "Camera", truck.prePass && "PrePass", truck.eldPt30 && "ELD", truck.tablet && "Tablet", truck.chains && "Chains"].filter(Boolean).join(", ") || "—"} />
        </DetailPanel>

        <DetailPanel title={`Assignment History (${truck.assignments.length})`}>
          {truck.assignments.length === 0 ? (
            <p className="text-sm text-muted py-4">No assignments yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {truck.assignments.map((a) => (
                <li key={a.id} className="py-3 flex items-center justify-between text-sm">
                  <span className="font-medium text-fg">{a.driver ? `${a.driver.firstName} ${a.driver.lastName}` : "—"}</span>
                  <span className="text-muted">
                    {new Date(a.pickupDate).toLocaleDateString()} → {a.dropoffDate ? new Date(a.dropoffDate).toLocaleDateString() : "present"}
                    {a.isActive && <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">active</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DetailPanel>
      </div>

      <HistoryTable
        title={`Service History (${truck.services.length})`}
        head={["Date", "Type", "Shop", "Status", "Cost"]}
        rows={truck.services.map((s) => [new Date(s.serviceDate).toLocaleDateString(), s.serviceType, s.shop, s.status, s.cost != null ? money(s.cost) : "—"])}
      />
      <HistoryTable
        title={`Expense History (${truck.expenses.length})`}
        head={["Date", "Category", "Vendor", "Status", "Amount"]}
        rows={truck.expenses.map((x) => [new Date(x.date).toLocaleDateString(), x.category, x.vendor, x.paymentStatus, money(x.amount)])}
      />

      {/* Assign modal */}
      {modal === "assign" && (
        <Modal title="Assign Driver" onClose={() => setModal(null)}>
          <form onSubmit={onAssign} className="space-y-4">
            <Field label="Driver">
              <select required value={assignForm.driverId} onChange={(e) => setAssignForm({ ...assignForm, driverId: e.target.value })} className="modal-input">
                <option value="">Select driver</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
              </select>
            </Field>
            <Field label="Pickup Date">
              <input required type="date" value={assignForm.pickupDate} onChange={(e) => setAssignForm({ ...assignForm, pickupDate: e.target.value })} className="modal-input" />
            </Field>
            <ModalActions loading={loading} onCancel={() => setModal(null)} submitLabel="Assign" />
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {modal === "edit" && (
        <Modal title="Edit Truck" onClose={() => setModal(null)}>
          <form onSubmit={onEdit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Unit Number">
                <input required value={editForm.unitNumber} onChange={(e) => setEditForm({ ...editForm, unitNumber: e.target.value })} className="modal-input" />
              </Field>
              <Field label="VIN">
                <input required value={editForm.vin} onChange={(e) => setEditForm({ ...editForm, vin: e.target.value })} className="modal-input" />
              </Field>
              <Field label="License Plate">
                <input required value={editForm.licensePlate} onChange={(e) => setEditForm({ ...editForm, licensePlate: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Make">
                <input required value={editForm.make} onChange={(e) => setEditForm({ ...editForm, make: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Year">
                <input required type="number" value={editForm.year} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Ownership">
                <select value={editForm.ownershipType} onChange={(e) => setEditForm({ ...editForm, ownershipType: e.target.value as typeof editForm.ownershipType })} className="modal-input">
                  <option value="COMPANY">Company</option>
                  <option value="LEASED">Leased</option>
                  <option value="OWNER_OPERATOR">Owner Operator</option>
                </select>
              </Field>
              <Field label="Home Location">
                <input required value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Motive Gateway">
                <input value={editForm.motiveGateway} onChange={(e) => setEditForm({ ...editForm, motiveGateway: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Camera">
                <input value={editForm.camera} onChange={(e) => setEditForm({ ...editForm, camera: e.target.value })} className="modal-input" />
              </Field>
              <Field label="PrePass">
                <input value={editForm.prePass} onChange={(e) => setEditForm({ ...editForm, prePass: e.target.value })} className="modal-input" />
              </Field>
              <Field label="ELD PT30">
                <input value={editForm.eldPt30} onChange={(e) => setEditForm({ ...editForm, eldPt30: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Tablet">
                <input value={editForm.tablet} onChange={(e) => setEditForm({ ...editForm, tablet: e.target.value })} className="modal-input" />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-fg">
              <input type="checkbox" checked={editForm.chains} onChange={(e) => setEditForm({ ...editForm, chains: e.target.checked })} />
              Chains
            </label>
            <Field label="Notes">
              <textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="modal-input" />
            </Field>
            <ModalActions loading={loading} onCancel={() => setModal(null)} submitLabel="Save" />
          </form>
        </Modal>
      )}

      {/* Move modal */}
      {modal === "move" && (
        <Modal title="Move / Drop Truck" onClose={() => setModal(null)}>
          <form onSubmit={onMove} className="space-y-4">
            <Field label="Action">
              <select value={moveForm.mode} onChange={(e) => setMoveForm({ ...moveForm, mode: e.target.value })} className="modal-input">
                <option value="DROP_YARD">Drop at yard (leaving company → Unassigned)</option>
                <option value="DROP_SERVICE">Send to service (leaving company → In Service)</option>
                <option value="SERVICE_HOME">Service, driver going home (keep driver → In Service)</option>
              </select>
            </Field>
            {moveForm.mode !== "SERVICE_HOME" && (
              <>
                <Field label="Location (city/state)">
                  <input value={moveForm.location} onChange={(e) => setMoveForm({ ...moveForm, location: e.target.value })} className="modal-input" />
                </Field>
                <Field label="Reason / Status">
                  <input value={moveForm.reason} onChange={(e) => setMoveForm({ ...moveForm, reason: e.target.value })} className="modal-input" />
                </Field>
              </>
            )}
            <Field label="Notes">
              <input value={moveForm.notes} onChange={(e) => setMoveForm({ ...moveForm, notes: e.target.value })} className="modal-input" />
            </Field>
            <ModalActions loading={loading} onCancel={() => setModal(null)} submitLabel="Confirm" />
          </form>
        </Modal>
      )}
    </div>
  );
}
