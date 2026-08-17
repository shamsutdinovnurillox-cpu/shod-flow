"use client";

import { showError } from "@/components/ui/toast";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignTrailer, dropTrailer, setTrailerStatus, updateTrailer } from "@/app/actions/fleet";
import type { TrailerProfile, Driver } from "@/types/models";
import { Container, User, MapPin, Wrench, DollarSign } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { money, InfoCard, DetailPanel, Row, HistoryTable, Modal, Field, ModalActions } from "@/components/ui/profile";

const today = () => new Date().toISOString().split("T")[0];

const CARGO_STATUSES = ["EMPTY", "BOOKED", "LANE", "SERVICE", "LOADED"];

const STATUS_STYLES: Record<string, string> = {
  UNASSIGNED: "bg-surface-2 text-muted",
  EMPTY: "bg-blue-50 text-blue-700",
  BOOKED: "bg-purple-50 text-purple-700",
  LANE: "bg-indigo-50 text-indigo-700",
  SERVICE: "bg-yellow-50 text-yellow-700",
  LOADED: "bg-green-50 text-green-700",
};

export function TrailerProfileClient({ trailer, drivers }: { trailer: TrailerProfile; drivers: Driver[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<null | "assign" | "drop" | "status" | "edit">(null);
  const [loading, setLoading] = useState(false);

  const activeAssignment = trailer.assignments.find((a) => a.isActive);
  const currentDriver = activeAssignment?.driver;
  const serviceCost = trailer.services.reduce((s, x) => s + (x.cost ?? 0), 0);
  const expenseCost = trailer.expenses.reduce((s, x) => s + x.amount, 0);

  const [assignForm, setAssignForm] = useState({ driverId: drivers[0]?.id ?? "", pickupDate: today() });
  const [dropForm, setDropForm] = useState({ location: "", reason: "", notes: "" });
  const [statusVal, setStatusVal] = useState(trailer.status);
  const toDateInput = (d: Date | string) => new Date(d).toISOString().split("T")[0];
  const [editForm, setEditForm] = useState({
    trailerNumber: trailer.trailerNumber,
    vin: trailer.vin,
    year: String(trailer.year),
    make: trailer.make,
    licensePlate: trailer.licensePlate,
    state: trailer.state,
    location: trailer.location,
    pickupDate: toDateInput(trailer.pickupDate),
    annualInspectionDate: toDateInput(trailer.annualInspectionDate),
    notes: trailer.notes ?? "",
  });

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setLoading(true);
    try {
      await fn();
      setModal(null);
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <BackLink href="/fleet/trailers" label="Back to Trailers" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><Container className="h-8 w-8" /></div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-fg">{trailer.trailerNumber}</h1>
            <p className="text-muted">{trailer.make} · {trailer.year} · {trailer.state}</p>
          </div>
          <span className={`ml-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[trailer.status] ?? "bg-surface-2 text-muted"}`}>
            {trailer.status}
          </span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setModal("assign")} className="btn btn-primary">Assign Driver</button>
          <button onClick={() => setModal("status")} className="btn btn-secondary">Set Status</button>
          <button onClick={() => setModal("drop")} className="btn btn-secondary">Drop</button>
          <button onClick={() => setModal("edit")} className="btn btn-secondary">Edit</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <InfoCard icon={User} color="bg-emerald-100 text-emerald-600" label="Current Driver" value={currentDriver ? `${currentDriver.firstName} ${currentDriver.lastName}` : "—"} />
        <InfoCard icon={MapPin} color="bg-indigo-100 text-indigo-600" label="Location" value={trailer.location} />
        <InfoCard icon={Wrench} color="bg-yellow-100 text-yellow-600" label="Dormant Days" value={String(trailer.dormantDays)} />
        <InfoCard icon={DollarSign} color="bg-teal-100 text-teal-600" label="Combined Cost" value={money(serviceCost + expenseCost)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DetailPanel title="Trailer Details">
          <Row k="VIN" v={trailer.vin} />
          <Row k="License Plate" v={`${trailer.licensePlate} / ${trailer.state}`} />
          <Row k="Annual Inspection" v={new Date(trailer.annualInspectionDate).toLocaleDateString()} />
          <Row k="Pickup Date" v={new Date(trailer.pickupDate).toLocaleDateString()} />
        </DetailPanel>

        <DetailPanel title={`Usage / Location History (${trailer.assignments.length})`}>
          {trailer.assignments.length === 0 ? (
            <p className="text-sm text-muted py-4">No history yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {trailer.assignments.map((a) => (
                <li key={a.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-fg">{a.driver ? `${a.driver.firstName} ${a.driver.lastName}` : "—"}</span>
                    <span className="text-muted">
                      {new Date(a.pickupDate).toLocaleDateString()} → {a.dropoffDate ? new Date(a.dropoffDate).toLocaleDateString() : "present"}
                      {a.isActive && <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">active</span>}
                    </span>
                  </div>
                  {(a.location || a.reason) && <p className="text-xs text-faint mt-1">{[a.location, a.reason].filter(Boolean).join(" · ")}</p>}
                </li>
              ))}
            </ul>
          )}
        </DetailPanel>
      </div>

      <HistoryTable
        title={`Service History (${trailer.services.length})`}
        head={["Date", "Type", "Shop", "Status", "Cost"]}
        rows={trailer.services.map((s) => [new Date(s.serviceDate).toLocaleDateString(), s.serviceType, s.shop, s.status, s.cost != null ? money(s.cost) : "—"])}
      />
      <HistoryTable
        title={`Expense History (${trailer.expenses.length})`}
        head={["Date", "Category", "Vendor", "Status", "Amount"]}
        rows={trailer.expenses.map((x) => [new Date(x.date).toLocaleDateString(), x.category, x.vendor, x.paymentStatus, money(x.amount)])}
      />

      {modal === "edit" && (
        <Modal title="Edit Trailer" onClose={() => setModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); run(async () => { await updateTrailer(trailer.id, editForm); }, "Saqlashda xatolik."); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Trailer Number">
                <input required value={editForm.trailerNumber} onChange={(e) => setEditForm({ ...editForm, trailerNumber: e.target.value })} className="modal-input" />
              </Field>
              <Field label="VIN">
                <input required value={editForm.vin} onChange={(e) => setEditForm({ ...editForm, vin: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Year">
                <input required type="number" value={editForm.year} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Make">
                <input required value={editForm.make} onChange={(e) => setEditForm({ ...editForm, make: e.target.value })} className="modal-input" />
              </Field>
              <Field label="License Plate">
                <input required value={editForm.licensePlate} onChange={(e) => setEditForm({ ...editForm, licensePlate: e.target.value })} className="modal-input" />
              </Field>
              <Field label="State">
                <input required value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Home Location">
                <input required value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Pickup Date">
                <input required type="date" value={editForm.pickupDate} onChange={(e) => setEditForm({ ...editForm, pickupDate: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Annual Inspection">
                <input required type="date" value={editForm.annualInspectionDate} onChange={(e) => setEditForm({ ...editForm, annualInspectionDate: e.target.value })} className="modal-input" />
              </Field>
            </div>
            <Field label="Notes">
              <textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="modal-input" />
            </Field>
            <ModalActions loading={loading} onCancel={() => setModal(null)} submitLabel="Save" />
          </form>
        </Modal>
      )}

      {modal === "assign" && (
        <Modal title="Assign Driver" onClose={() => setModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); run(() => assignTrailer({ trailerId: trailer.id, driverId: assignForm.driverId, pickupDate: assignForm.pickupDate }), "Biriktirishda xatolik."); }} className="space-y-4">
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

      {modal === "status" && (
        <Modal title="Set Cargo Status" onClose={() => setModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); run(() => setTrailerStatus({ trailerId: trailer.id, status: statusVal }), "Statusni yangilashda xatolik."); }} className="space-y-4">
            <Field label="Status">
              <select value={statusVal} onChange={(e) => setStatusVal(e.target.value as typeof statusVal)} className="modal-input">
                {CARGO_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <ModalActions loading={loading} onCancel={() => setModal(null)} submitLabel="Update" />
          </form>
        </Modal>
      )}

      {modal === "drop" && (
        <Modal title="Drop Trailer" onClose={() => setModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); run(() => dropTrailer({ trailerId: trailer.id, location: dropForm.location, reason: dropForm.reason, notes: dropForm.notes }), "Drop xatolik."); }} className="space-y-4">
            <Field label="Location (city/state)">
              <input value={dropForm.location} onChange={(e) => setDropForm({ ...dropForm, location: e.target.value })} className="modal-input" />
            </Field>
            <Field label="Reason / Status">
              <input value={dropForm.reason} onChange={(e) => setDropForm({ ...dropForm, reason: e.target.value })} className="modal-input" />
            </Field>
            <Field label="Notes">
              <input value={dropForm.notes} onChange={(e) => setDropForm({ ...dropForm, notes: e.target.value })} className="modal-input" />
            </Field>
            <ModalActions loading={loading} onCancel={() => setModal(null)} submitLabel="Drop" />
          </form>
        </Modal>
      )}
    </div>
  );
}
