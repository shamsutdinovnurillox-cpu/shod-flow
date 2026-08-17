"use client";

import { showError } from "@/components/ui/toast";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assignTruck, moveTruck, updateTruck } from "@/app/actions/fleet";
import type { TruckProfile, Driver } from "@/types/models";
import { Truck, User, MapPin, Wrench, DollarSign } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { money, InfoCard, DetailPanel, Row, HistoryTable, Modal, Field, ModalActions } from "@/components/ui/profile";
import { DeviceAssignmentPanel, DeviceHistoryPanel } from "@/components/fleet/DevicesPanel";
import type { DeviceAssignmentRow } from "@/types/models";
import { ExpiryDate, fmtDate, fmtDateTime } from "@/components/ui/expiry";

const today = () => new Date().toISOString().split("T")[0];

const STATUS_STYLES: Record<string, string> = {
  ASSIGNED: "bg-blue-50 text-blue-700",
  UNASSIGNED: "bg-surface-2 text-muted",
  IN_SERVICE: "bg-yellow-50 text-yellow-700",
};

const DRIVER_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  ON_LEAVE: "bg-amber-50 text-amber-700",
  TERMINATED: "bg-surface-2 text-muted",
};

const DRIVER_TYPE_LABELS: Record<string, string> = {
  COMPANY: "Company",
  OWNER_OPERATOR: "Owner Operator",
  LEASE_PURCHASE: "Lease Purchase",
};

export function TruckProfileClient({
  truck,
  drivers,
  deviceHistory,
}: {
  truck: TruckProfile;
  drivers: Driver[];
  deviceHistory: DeviceAssignmentRow[];
}) {
  const router = useRouter();
  const [modal, setModal] = useState<null | "assign" | "move" | "edit">(null);
  const [loading, setLoading] = useState(false);

  const activeAssignment = truck.assignments.find((a) => a.isActive);
  const currentDriver = activeAssignment?.driver;

  const serviceCost = truck.services.reduce((s, x) => s + (x.cost ?? 0), 0);
  const expenseCost = truck.expenses.reduce((s, x) => s + x.amount, 0);

  // Faqat faol haydovchini biriktirish mumkin — bo'shatilgan yoki ta'tildagisi emas.
  const assignableDrivers = drivers.filter((d) => d.status === "ACTIVE");
  const [assignForm, setAssignForm] = useState({ driverId: "", pickupDate: today() });
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
    registrationExpiry: truck.registrationExpiry ? new Date(truck.registrationExpiry).toISOString().split("T")[0] : "",
    annualInspectionDate: truck.annualInspectionDate ? new Date(truck.annualInspectionDate).toISOString().split("T")[0] : "",
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
      <BackLink href="/fleet/trucks" label="Back to Trucks" />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Truck className="h-8 w-8" /></div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-fg">{truck.unitNumber}</h1>
            <p className="text-muted">{truck.make} · {truck.year} · {truck.ownershipType}</p>
          </div>
          <span className={`ml-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[truck.status] ?? "bg-surface-2 text-muted"}`}>
            {truck.status}
          </span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setModal("assign")} className="btn btn-primary">Assign Driver</button>
          <button onClick={() => setModal("move")} className="btn btn-secondary">Move / Drop</button>
          <button onClick={() => setModal("edit")} className="btn btn-secondary">Edit</button>
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
          <Row k="Registration Expiry" v={<ExpiryDate date={truck.registrationExpiry} />} />
          <Row k="Annual Inspection" v={<ExpiryDate date={truck.annualInspectionDate} />} />
          <Row k="Devices" v={truck.devices.map((d) => d.name).join(", ") || "—"} />
        </DetailPanel>

        {/* Joriy haydovchi — ma'lumot Driver jadvalidan, profilga havola bilan. */}
        <DetailPanel title="Current Driver">
          {currentDriver ? (
            <>
              <div className="flex items-center justify-between pb-3">
                <Link href={`/safety/drivers/${currentDriver.id}`} className="text-base font-semibold text-blue-600 hover:underline">
                  {currentDriver.firstName} {currentDriver.lastName}
                </Link>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${DRIVER_STATUS_STYLES[currentDriver.status] ?? "bg-surface-2 text-muted"}`}>
                  {currentDriver.status}
                </span>
              </div>
              <Row k="Driver Type" v={DRIVER_TYPE_LABELS[currentDriver.driverType] ?? currentDriver.driverType} />
              <Row k="CDL Number" v={`${currentDriver.cdlNumber} (${currentDriver.cdlState})`} />
              <Row k="CDL Expiration" v={<ExpiryDate date={currentDriver.cdlExpiryDate} />} />
              <Row k="Medical Expiration" v={<ExpiryDate date={currentDriver.medCardExpiryDate} />} />
              <Row k="Hired" v={fmtDate(currentDriver.hireDate)} />
              <Row k="Pickup Date" v={fmtDate(activeAssignment?.pickupDate)} />
            </>
          ) : (
            <p className="py-4 text-sm text-muted">No driver assigned.</p>
          )}
        </DetailPanel>
      </div>

      <DetailPanel title={`Assignment History (${truck.assignments.length})`}>
        {truck.assignments.length === 0 ? (
          <p className="text-sm text-muted py-4">No assignments yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {truck.assignments.map((a) => (
              <li key={a.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                {a.driver ? (
                  <Link href={`/safety/drivers/${a.driver.id}`} className="font-medium text-blue-600 hover:underline">
                    {a.driver.firstName} {a.driver.lastName}
                    <span className="ml-2 text-xs font-normal text-muted">
                      {DRIVER_TYPE_LABELS[a.driver.driverType] ?? a.driver.driverType} · CDL {a.driver.cdlNumber}
                    </span>
                  </Link>
                ) : (
                  <span className="font-medium text-fg">—</span>
                )}
                <span className="text-muted">
                  {fmtDate(a.pickupDate)} → {a.dropoffDate ? fmtDate(a.dropoffDate) : "present"}
                  {a.isActive && <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">active</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DetailPanel>

      <DeviceAssignmentPanel truckId={truck.id} truckVin={truck.vin} initialDevices={truck.devices} />

      <DeviceHistoryPanel assignments={deviceHistory} />

      <HistoryTable
        title={`Service History (${truck.services.length})`}
        head={["Service Date", "Service Type", "Status", "Shop Name", "Mechanic", "Cost", "Odometer", "Description", "Arrived", "Resolved"]}
        rows={truck.services.map((s) => [
          <span key="d" className="font-medium text-fg">{fmtDate(s.serviceDate)}</span>,
          s.serviceType,
          <span key="s" className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${s.status === "COMPLETED" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
            {s.status === "COMPLETED" ? "Completed" : "In Progress"}
          </span>,
          s.shop,
          s.mechanic || "—",
          s.cost != null ? money(s.cost) : "—",
          s.odometer != null ? s.odometer.toLocaleString() : "—",
          s.description || "—",
          fmtDateTime(s.arrivalTime),
          fmtDateTime(s.completionTime),
        ])}
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
                {assignableDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.firstName} {d.lastName} — {DRIVER_TYPE_LABELS[d.driverType] ?? d.driverType} · CDL {d.cdlNumber}
                  </option>
                ))}
              </select>
              {assignableDrivers.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">No active drivers available.</p>
              )}
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
          <form onSubmit={onEdit} className="space-y-4">
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
              <Field label="Registration Expiry">
                <input type="date" value={editForm.registrationExpiry} onChange={(e) => setEditForm({ ...editForm, registrationExpiry: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Annual Inspection">
                <input type="date" value={editForm.annualInspectionDate} onChange={(e) => setEditForm({ ...editForm, annualInspectionDate: e.target.value })} className="modal-input" />
              </Field>
            </div>
            <p className="text-xs text-muted">Devices are managed in the Devices panel below.</p>
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
