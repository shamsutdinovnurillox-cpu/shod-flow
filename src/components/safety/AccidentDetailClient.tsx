"use client";

import { showError } from "@/components/ui/toast";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateAccident, setAccidentStatus } from "@/app/actions/safety";
import type { AccidentWithRefs, Truck, Document } from "@/types/models";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { DetailPanel, Row, Modal, Field, ModalActions } from "@/components/ui/profile";
import { EntityDocumentsPanel } from "@/components/EntityDocumentsPanel";
import { AuditTimeline } from "@/components/AuditTimeline";

interface TimelineLog {
  id: string;
  action: string;
  timestamp: Date | string;
  details: unknown;
  user: { name: string | null; email: string | null };
}

const toDateInput = (d: Date | string) => new Date(d).toISOString().split("T")[0];

export function AccidentDetailClient({ accident, trucks, documents, logs }: {
  accident: AccidentWithRefs;
  trucks: Truck[];
  documents: Document[];
  logs: TimelineLog[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    truckId: accident.truckId ?? "",
    date: toDateInput(accident.date),
    location: accident.location,
    fault: accident.fault,
    postAccidentTestDone: accident.postAccidentTestDone,
    claimNumber: accident.claimNumber ?? "",
    adjuster: accident.adjuster ?? "",
    notes: accident.notes ?? "",
  });

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setLoading(true);
    try {
      await fn();
      setEditOpen(false);
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : fallback);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = () => {
    const next = accident.status === "PENDING" ? "CLOSED" : "PENDING";
    if (!confirm(`Change accident status to ${next}?`)) return;
    run(() => setAccidentStatus(accident.id, next), "Amaliyot bajarilmadi.");
  };

  return (
    <div className="space-y-8">
      <Link href="/safety/accidents" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Back to Accidents
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <div className="p-3 bg-red-100 text-red-600 rounded-xl"><AlertTriangle className="h-8 w-8" /></div>
        <div>
          <h1 className="text-3xl font-bold text-fg">Accident — {new Date(accident.date).toLocaleDateString()}</h1>
          <p className="text-muted">{accident.location}</p>
        </div>
        <span className={`ml-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
          accident.status === "PENDING" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
        }`}>
          {accident.status}
        </span>
        {!accident.postAccidentTestDone && accident.status === "PENDING" && (
          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
            POST-ACCIDENT TEST PENDING
          </span>
        )}
        <div className="ml-auto flex gap-3">
          <button onClick={() => setEditOpen(true)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2">Edit</button>
          <button onClick={toggleStatus} className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
            accident.status === "PENDING" ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"
          }`}>
            {accident.status === "PENDING" ? "Close Accident" : "Reopen"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DetailPanel title="Details">
          <Row k="Fault" v={accident.fault} />
          <Row k="Post-Accident Test" v={accident.postAccidentTestDone ? "Completed" : "NOT completed"} />
          <Row k="Claim Number" v={accident.claimNumber ?? "—"} />
          <Row k="Adjuster" v={accident.adjuster ?? "—"} />
          <Row k="Notes" v={accident.notes ?? "—"} />
        </DetailPanel>

        <DetailPanel title="Linked Records">
          <div className="flex justify-between py-2 text-sm border-b border-border/60">
            <span className="text-muted">Driver</span>
            <Link href={`/safety/drivers/${accident.driverId}`} className="font-medium text-blue-600 hover:underline">
              {accident.driver.firstName} {accident.driver.lastName}
            </Link>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span className="text-muted">Truck</span>
            {accident.truck ? (
              <Link href={`/fleet/trucks/${accident.truck.id}`} className="font-medium text-blue-600 hover:underline">
                {accident.truck.unitNumber} ({accident.truck.make} {accident.truck.year})
              </Link>
            ) : (
              <span className="font-medium text-fg">—</span>
            )}
          </div>
        </DetailPanel>
      </div>

      <EntityDocumentsPanel entityType="ACCIDENT" entityId={accident.id} initialDocuments={documents} defaultDocType="ACCIDENT_FILE" />

      <AuditTimeline logs={logs} />

      {editOpen && (
        <Modal title="Edit Accident" onClose={() => setEditOpen(false)}>
          <form
            onSubmit={(e) => { e.preventDefault(); run(() => updateAccident(accident.id, editForm), "Saqlashda xatolik."); }}
            className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
          >
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date">
                <input required type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Truck">
                <select value={editForm.truckId} onChange={(e) => setEditForm({ ...editForm, truckId: e.target.value })} className="modal-input">
                  <option value="">None</option>
                  {trucks.map((t) => <option key={t.id} value={t.id}>{t.unitNumber}</option>)}
                </select>
              </Field>
              <Field label="Fault">
                <select value={editForm.fault} onChange={(e) => setEditForm({ ...editForm, fault: e.target.value })} className="modal-input">
                  <option value="NOT_SPECIFIED">Not specified</option>
                  <option value="AT_FAULT">At fault</option>
                  <option value="NOT_AT_FAULT">Not at fault</option>
                </select>
              </Field>
              <Field label="Location">
                <input required value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Claim Number">
                <input value={editForm.claimNumber} onChange={(e) => setEditForm({ ...editForm, claimNumber: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Adjuster">
                <input value={editForm.adjuster} onChange={(e) => setEditForm({ ...editForm, adjuster: e.target.value })} className="modal-input" />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-fg">
              <input type="checkbox" checked={editForm.postAccidentTestDone} onChange={(e) => setEditForm({ ...editForm, postAccidentTestDone: e.target.checked })} />
              Post-accident test completed
            </label>
            <Field label="Notes">
              <textarea rows={3} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="modal-input" />
            </Field>
            <ModalActions loading={loading} onCancel={() => setEditOpen(false)} submitLabel="Save" />
          </form>
        </Modal>
      )}
    </div>
  );
}
