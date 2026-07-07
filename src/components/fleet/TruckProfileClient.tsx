"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assignTruck, moveTruck } from "@/app/actions/fleet";
import type { TruckProfile, Driver } from "@/types/models";
import { ArrowLeft, Truck, User, MapPin, Wrench, DollarSign } from "lucide-react";
import { money, InfoCard, DetailPanel, Row, HistoryTable, Modal, Field, ModalActions } from "@/components/ui/profile";

const today = () => new Date().toISOString().split("T")[0];

const STATUS_STYLES: Record<string, string> = {
  ASSIGNED: "bg-blue-50 text-blue-700",
  UNASSIGNED: "bg-gray-100 text-gray-600",
  IN_SERVICE: "bg-yellow-50 text-yellow-700",
};

export function TruckProfileClient({ truck, drivers }: { truck: TruckProfile; drivers: Driver[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<null | "assign" | "move">(null);
  const [loading, setLoading] = useState(false);

  const activeAssignment = truck.assignments.find((a) => a.isActive);
  const currentDriver = activeAssignment?.driver;

  const serviceCost = truck.services.reduce((s, x) => s + (x.cost ?? 0), 0);
  const expenseCost = truck.expenses.reduce((s, x) => s + x.amount, 0);

  const [assignForm, setAssignForm] = useState({ driverId: drivers[0]?.id ?? "", pickupDate: today() });
  const [moveForm, setMoveForm] = useState({ mode: "DROP_YARD", location: "", reason: "", notes: "" });

  const onAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await assignTruck({ truckId: truck.id, driverId: assignForm.driverId, pickupDate: assignForm.pickupDate });
      setModal(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Biriktirishda xatolik.");
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
      alert(err instanceof Error ? err.message : "O'zgartirishda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Link href="/fleet/trucks" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Back to Trucks
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Truck className="h-8 w-8" /></div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{truck.unitNumber}</h1>
            <p className="text-gray-500">{truck.make} · {truck.year} · {truck.ownershipType}</p>
          </div>
          <span className={`ml-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[truck.status] ?? "bg-gray-100 text-gray-600"}`}>
            {truck.status}
          </span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setModal("assign")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Assign Driver</button>
          <button onClick={() => setModal("move")} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Move / Drop</button>
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
            <p className="text-sm text-gray-500 py-4">No assignments yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {truck.assignments.map((a) => (
                <li key={a.id} className="py-3 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">{a.driver ? `${a.driver.firstName} ${a.driver.lastName}` : "—"}</span>
                  <span className="text-gray-500">
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
