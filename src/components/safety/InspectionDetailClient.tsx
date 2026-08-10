"use client";

import { showError } from "@/components/ui/toast";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateInspection, setInspectionStatus } from "@/app/actions/safety";
import type { InspectionWithRefs, Truck, Document } from "@/types/models";
import type { InspectionStatus } from "@prisma/client";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { DetailPanel, Row, Modal, Field, ModalActions, money } from "@/components/ui/profile";
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

const STATUS_STYLES: Record<string, string> = {
  CLEAN: "bg-green-50 text-green-700",
  VIOLATION: "bg-red-50 text-red-700",
  PENDING_REVIEW: "bg-yellow-50 text-yellow-700",
  CLOSED: "bg-surface-2 text-muted",
};

const ALL_STATUSES: InspectionStatus[] = ["PENDING_REVIEW", "CLEAN", "VIOLATION", "CLOSED"];

export function InspectionDetailClient({ inspection, trucks, documents, logs }: {
  inspection: InspectionWithRefs;
  trucks: Truck[];
  documents: Document[];
  logs: TimelineLog[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    truckId: inspection.truckId ?? "",
    date: toDateInput(inspection.date),
    state: inspection.state,
    level: String(inspection.level),
    violations: inspection.violations ?? "",
    bonusOrPenalty: inspection.bonusOrPenalty != null ? String(inspection.bonusOrPenalty) : "",
    notes: inspection.notes ?? "",
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

  const onStatusChange = (status: InspectionStatus) => {
    if (status === inspection.status) return;
    if (!confirm(`Change inspection status to ${status}?`)) return;
    run(() => setInspectionStatus(inspection.id, status), "Amaliyot bajarilmadi.");
  };

  return (
    <div className="space-y-8">
      <Link href="/safety/inspections" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Back to Inspections
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl"><ClipboardCheck className="h-8 w-8" /></div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-fg">Inspection — {new Date(inspection.date).toLocaleDateString()}</h1>
          <p className="text-muted">{inspection.state} · Level {inspection.level}</p>
        </div>
        <span className={`ml-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[inspection.status] ?? "bg-surface-2 text-muted"}`}>
          {inspection.status}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <select
            value={inspection.status}
            onChange={(e) => onStatusChange(e.target.value as InspectionStatus)}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-fg bg-surface"
          >
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => setEditOpen(true)} className="btn btn-secondary">Edit</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DetailPanel title="Details">
          <Row k="State" v={inspection.state} />
          <Row k="Level" v={`Level ${inspection.level}`} />
          <Row k="Violations" v={inspection.violations ?? "—"} />
          <Row k="Bonus / Charge" v={inspection.bonusOrPenalty != null ? money(inspection.bonusOrPenalty) : "—"} />
          <Row k="Notes" v={inspection.notes ?? "—"} />
        </DetailPanel>

        <DetailPanel title="Linked Records">
          <div className="flex justify-between py-2 text-sm border-b border-border/60">
            <span className="text-muted">Driver</span>
            <Link href={`/safety/drivers/${inspection.driverId}`} className="font-medium text-blue-600 hover:underline">
              {inspection.driver.firstName} {inspection.driver.lastName}
            </Link>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span className="text-muted">Truck</span>
            {inspection.truck ? (
              <Link href={`/fleet/trucks/${inspection.truck.id}`} className="font-medium text-blue-600 hover:underline">
                {inspection.truck.unitNumber} ({inspection.truck.make} {inspection.truck.year})
              </Link>
            ) : (
              <span className="font-medium text-fg">—</span>
            )}
          </div>
        </DetailPanel>
      </div>

      <EntityDocumentsPanel entityType="INSPECTION" entityId={inspection.id} initialDocuments={documents} defaultDocType="INSPECTION_REPORT" />

      <AuditTimeline logs={logs} />

      {editOpen && (
        <Modal title="Edit Inspection" onClose={() => setEditOpen(false)}>
          <form
            onSubmit={(e) => { e.preventDefault(); run(() => updateInspection(inspection.id, editForm), "Saqlashda xatolik."); }}
            className="space-y-4"
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
              <Field label="State">
                <input required value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Level (1–7)">
                <select value={editForm.level} onChange={(e) => setEditForm({ ...editForm, level: e.target.value })} className="modal-input">
                  {[1, 2, 3, 4, 5, 6, 7].map((l) => <option key={l} value={l}>Level {l}</option>)}
                </select>
              </Field>
              <Field label="Bonus / Charge ($)">
                <input type="number" step="0.01" value={editForm.bonusOrPenalty} onChange={(e) => setEditForm({ ...editForm, bonusOrPenalty: e.target.value })} className="modal-input" />
              </Field>
            </div>
            <Field label="Violations">
              <textarea rows={2} value={editForm.violations} onChange={(e) => setEditForm({ ...editForm, violations: e.target.value })} className="modal-input" />
            </Field>
            <Field label="Notes">
              <textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="modal-input" />
            </Field>
            <ModalActions loading={loading} onCancel={() => setEditOpen(false)} submitLabel="Save" />
          </form>
        </Modal>
      )}
    </div>
  );
}
