"use client";

import { showError } from "@/components/ui/toast";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateCargoClaim, setCargoClaimStatus } from "@/app/actions/safety";
import type { CargoClaimWithRefs, Truck, Document } from "@/types/models";
import { ArrowLeft, PackageX } from "lucide-react";
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

export function CargoClaimDetailClient({ claim, trucks, documents, logs }: {
  claim: CargoClaimWithRefs;
  trucks: Truck[];
  documents: Document[];
  logs: TimelineLog[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    truckId: claim.truckId ?? "",
    date: toDateInput(claim.date),
    location: claim.location,
    loadNumber: claim.loadNumber,
    broker: claim.broker,
    claimNumber: claim.claimNumber ?? "",
    adjuster: claim.adjuster ?? "",
    notes: claim.notes ?? "",
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
    const next = claim.status === "PENDING" ? "CLOSED" : "PENDING";
    if (!confirm(`Change claim status to ${next}?`)) return;
    run(() => setCargoClaimStatus(claim.id, next), "Amaliyot bajarilmadi.");
  };

  return (
    <div className="space-y-8">
      <Link href="/safety/cargo-claims" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Back to Cargo Claims
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><PackageX className="h-8 w-8" /></div>
        <div>
          <h1 className="text-3xl font-bold text-fg">Claim {claim.claimNumber ?? `#${claim.loadNumber}`}</h1>
          <p className="text-muted">Loss date {new Date(claim.date).toLocaleDateString()} · {claim.location}</p>
        </div>
        <span className={`ml-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
          claim.status === "PENDING" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
        }`}>
          {claim.status}
        </span>
        <div className="ml-auto flex gap-3">
          <button onClick={() => setEditOpen(true)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2">Edit</button>
          <button onClick={toggleStatus} className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
            claim.status === "PENDING" ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"
          }`}>
            {claim.status === "PENDING" ? "Close Claim" : "Reopen"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DetailPanel title="Details">
          <Row k="Load Number" v={claim.loadNumber} />
          <Row k="Broker" v={claim.broker} />
          <Row k="Claim Number" v={claim.claimNumber ?? "—"} />
          <Row k="Adjuster" v={claim.adjuster ?? "—"} />
          <Row k="Loss Location" v={claim.location} />
          <Row k="Notes" v={claim.notes ?? "—"} />
        </DetailPanel>

        <DetailPanel title="Linked Records">
          <div className="flex justify-between py-2 text-sm border-b border-border/60">
            <span className="text-muted">Driver</span>
            <Link href={`/safety/drivers/${claim.driverId}`} className="font-medium text-blue-600 hover:underline">
              {claim.driver.firstName} {claim.driver.lastName}
            </Link>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span className="text-muted">Truck</span>
            {claim.truck ? (
              <Link href={`/fleet/trucks/${claim.truck.id}`} className="font-medium text-blue-600 hover:underline">
                {claim.truck.unitNumber} ({claim.truck.make} {claim.truck.year})
              </Link>
            ) : (
              <span className="font-medium text-fg">—</span>
            )}
          </div>
        </DetailPanel>
      </div>

      <EntityDocumentsPanel entityType="CLAIM" entityId={claim.id} initialDocuments={documents} defaultDocType="CARGO_CLAIM_FILE" />

      <AuditTimeline logs={logs} />

      {editOpen && (
        <Modal title="Edit Cargo Claim" onClose={() => setEditOpen(false)}>
          <form
            onSubmit={(e) => { e.preventDefault(); run(() => updateCargoClaim(claim.id, editForm), "Saqlashda xatolik."); }}
            className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
          >
            <div className="grid grid-cols-2 gap-4">
              <Field label="Loss Date">
                <input required type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Truck">
                <select value={editForm.truckId} onChange={(e) => setEditForm({ ...editForm, truckId: e.target.value })} className="modal-input">
                  <option value="">None</option>
                  {trucks.map((t) => <option key={t.id} value={t.id}>{t.unitNumber}</option>)}
                </select>
              </Field>
              <Field label="Load Number">
                <input required value={editForm.loadNumber} onChange={(e) => setEditForm({ ...editForm, loadNumber: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Broker">
                <input required value={editForm.broker} onChange={(e) => setEditForm({ ...editForm, broker: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Claim Number">
                <input value={editForm.claimNumber} onChange={(e) => setEditForm({ ...editForm, claimNumber: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Adjuster">
                <input value={editForm.adjuster} onChange={(e) => setEditForm({ ...editForm, adjuster: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Loss Location">
                <input required value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="modal-input" />
              </Field>
            </div>
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
