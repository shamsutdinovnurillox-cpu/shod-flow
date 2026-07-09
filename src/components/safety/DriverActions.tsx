"use client";

import { showError } from "@/components/ui/toast";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDriver, terminateDriver, reactivateDriver } from "@/app/actions/safety";
import type { Driver } from "@/types/models";
import { Modal, Field, ModalActions } from "@/components/ui/profile";

const toDateInput = (d: Date | string) => new Date(d).toISOString().split("T")[0];

/** Driver profili sarlavhasidagi Edit / Terminate / Reactivate tugmalari. */
export function DriverActions({ driver }: { driver: Driver }) {
  const router = useRouter();
  const [modal, setModal] = useState<null | "edit" | "terminate">(null);
  const [loading, setLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    firstName: driver.firstName,
    lastName: driver.lastName,
    dob: toDateInput(driver.dob),
    cdlNumber: driver.cdlNumber,
    cdlState: driver.cdlState,
    cdlIssueDate: toDateInput(driver.cdlIssueDate),
    cdlExpiryDate: toDateInput(driver.cdlExpiryDate),
    medCardExpiryDate: toDateInput(driver.medCardExpiryDate),
    hireDate: toDateInput(driver.hireDate),
    notes: driver.notes ?? "",
  });
  const [terminationDate, setTerminationDate] = useState(toDateInput(new Date()));

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
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

  const onReactivate = () => {
    if (!confirm("Reactivate this driver?")) return;
    run(() => reactivateDriver(driver.id), "Amaliyot bajarilmadi.");
  };

  return (
    <div className="ml-auto flex gap-3">
      <button onClick={() => setModal("edit")} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2">Edit</button>
      {driver.status === "ACTIVE" ? (
        <button onClick={() => setModal("terminate")} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">Terminate</button>
      ) : (
        <button onClick={onReactivate} className="rounded-lg border border-green-200 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50">Reactivate</button>
      )}

      {modal === "edit" && (
        <Modal title="Edit Driver" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => { e.preventDefault(); run(() => updateDriver(driver.id, editForm), "Saqlashda xatolik."); }}
            className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
          >
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name">
                <input required value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Last Name">
                <input required value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Date of Birth">
                <input required type="date" value={editForm.dob} onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Hire Date">
                <input required type="date" value={editForm.hireDate} onChange={(e) => setEditForm({ ...editForm, hireDate: e.target.value })} className="modal-input" />
              </Field>
              <Field label="CDL Number">
                <input required value={editForm.cdlNumber} onChange={(e) => setEditForm({ ...editForm, cdlNumber: e.target.value })} className="modal-input" />
              </Field>
              <Field label="CDL State">
                <input required value={editForm.cdlState} onChange={(e) => setEditForm({ ...editForm, cdlState: e.target.value })} className="modal-input" />
              </Field>
              <Field label="CDL Issue Date">
                <input required type="date" value={editForm.cdlIssueDate} onChange={(e) => setEditForm({ ...editForm, cdlIssueDate: e.target.value })} className="modal-input" />
              </Field>
              <Field label="CDL Expiry Date">
                <input required type="date" value={editForm.cdlExpiryDate} onChange={(e) => setEditForm({ ...editForm, cdlExpiryDate: e.target.value })} className="modal-input" />
              </Field>
              <Field label="Medical Card Expiry">
                <input required type="date" value={editForm.medCardExpiryDate} onChange={(e) => setEditForm({ ...editForm, medCardExpiryDate: e.target.value })} className="modal-input" />
              </Field>
            </div>
            <Field label="Notes">
              <textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="modal-input" />
            </Field>
            <ModalActions loading={loading} onCancel={() => setModal(null)} submitLabel="Save" />
          </form>
        </Modal>
      )}

      {modal === "terminate" && (
        <Modal title="Terminate Driver" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => { e.preventDefault(); run(() => terminateDriver(driver.id, terminationDate), "Amaliyot bajarilmadi."); }}
            className="space-y-4"
          >
            <p className="text-sm text-muted">
              {driver.firstName} {driver.lastName} statusi TERMINATED bo&apos;ladi va ro&apos;yxat oxiriga tushadi. Tarix saqlanadi.
            </p>
            <Field label="Termination Date">
              <input required type="date" value={terminationDate} onChange={(e) => setTerminationDate(e.target.value)} className="modal-input" />
            </Field>
            <ModalActions loading={loading} onCancel={() => setModal(null)} submitLabel="Terminate" />
          </form>
        </Modal>
      )}
    </div>
  );
}
