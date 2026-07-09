"use client";

import { showError } from "@/components/ui/toast";
import { useState, useRef } from "react";
import { createInsurance, setInsuranceStatus } from "@/app/actions/safety";
import { createDocument } from "@/app/actions/documents";
import { Plus } from "lucide-react";
import type { InsuranceWithRefs, Driver, Truck, Document } from "@/types/models";
import type { InsuranceStatus } from "@prisma/client";
import { Modal, Field, ModalActions } from "@/components/ui/profile";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  EXPIRED: "bg-red-50 text-red-700",
  MISSING: "bg-red-50 text-red-700",
  REJECTED: "bg-red-100 text-red-800",
  REMOVED: "bg-surface-2 text-muted",
};

export function InsuranceClient({ initialInsurance, drivers, trucks, initialCoiDocs }: { initialInsurance: InsuranceWithRefs[], drivers: Driver[], trucks: Truck[], initialCoiDocs: Document[] }) {
  const [insurances, setInsurances] = useState(initialInsurance);
  const [coiDocs, setCoiDocs] = useState(initialCoiDocs);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [coiTarget, setCoiTarget] = useState<InsuranceWithRefs | null>(null);
  const [loading, setLoading] = useState(false);
  const coiFormRef = useRef<HTMLFormElement>(null);

  const coiFor = (insId: string) => coiDocs.find((d) => d.entityId === insId);

  const handleCoiUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coiTarget) return;
    setLoading(true);
    try {
      const formData = new FormData(coiFormRef.current!);
      formData.set("entityType", "INSURANCE");
      formData.set("entityId", coiTarget.id);
      formData.set("type", "COI");
      const newDoc = await createDocument(formData);
      setCoiDocs((prev) => [newDoc, ...prev]);
      setCoiTarget(null);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Yuklashda xatolik.");
    } finally {
      setLoading(false);
    }
  };
  
  const [formData, setFormData] = useState({
    type: "OCC_ACC",
    driverId: (drivers && drivers.length > 0) ? drivers[0].id : "",
    truckId: "",
    endDate: new Date().toISOString().split('T')[0],
  });

  const changeStatus = async (ins: InsuranceWithRefs, status: InsuranceStatus) => {
    let rejectionNotes: string | undefined;
    if (status === "REJECTED") {
      const answer = prompt("Rad etish sababi (majburiy):");
      if (!answer?.trim()) return;
      rejectionNotes = answer.trim();
    } else if (!confirm(`Change policy status to ${status}?`)) {
      return;
    }
    try {
      const updated = await setInsuranceStatus(ins.id, status, rejectionNotes);
      setInsurances((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (error) {
      showError(error instanceof Error ? error.message : "Amaliyot bajarilmadi.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newIns = await createInsurance(formData);
      setInsurances([newIns, ...insurances]);
      setIsModalOpen(false);
      setFormData({
        type: "OCC_ACC",
        driverId: (drivers && drivers.length > 0) ? drivers[0].id : "",
        truckId: "",
        endDate: new Date().toISOString().split('T')[0],
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : "Sug'urta qo'shishda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg">Insurance Policies</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Policy
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="bg-surface-2 text-fg">
              <tr>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Target</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Expiry Date</th>
                <th className="px-6 py-4 font-medium">COI</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {insurances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted">
                    No insurance policies found.
                  </td>
                </tr>
              ) : (
                insurances.map((ins) => {
                  const isExpired = ins.status === "ACTIVE" && ins.expiryDate ? new Date(ins.expiryDate) < new Date() : false;
                  const shownStatus = isExpired ? "EXPIRED" : ins.status;
                  return (
                    <tr key={ins.id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-6 py-4 font-medium text-fg">{ins.type}</td>
                      <td className="px-6 py-4">
                        {ins.type === 'OCC_ACC'
                          ? `${ins.driver?.firstName || ''} ${ins.driver?.lastName || ''}`
                          : (ins.truck?.unitNumber || 'N/A')}
                      </td>
                      <td className="px-6 py-4">{ins.expiryDate ? new Date(ins.expiryDate).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-6 py-4">
                        {coiFor(ins.id) ? (
                          <a href={coiFor(ins.id)!.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-medium">View COI</a>
                        ) : (
                          <button onClick={() => setCoiTarget(ins)} className="text-sm font-medium text-muted hover:text-blue-600 hover:underline">Upload COI</button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLES[shownStatus] ?? 'bg-surface-2 text-muted'}`}
                          title={ins.status === 'REJECTED' && ins.rejectionNotes ? ins.rejectionNotes : undefined}
                        >
                          {shownStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3 text-sm font-medium">
                          {ins.status === 'ACTIVE' ? (
                            <>
                              <button onClick={() => changeStatus(ins, 'REMOVED')} className="text-yellow-600 hover:underline">Remove</button>
                              <button onClick={() => changeStatus(ins, 'REJECTED')} className="text-red-600 hover:underline">Reject</button>
                            </>
                          ) : (
                            <button onClick={() => changeStatus(ins, 'ACTIVE')} className="text-green-600 hover:underline">Reactivate</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {coiTarget && (
        <Modal title="Upload COI File" onClose={() => setCoiTarget(null)}>
          <form ref={coiFormRef} onSubmit={handleCoiUpload} className="space-y-4">
            <p className="text-sm text-muted">
              {coiTarget.type} — {coiTarget.type === "OCC_ACC"
                ? `${coiTarget.driver?.firstName ?? ""} ${coiTarget.driver?.lastName ?? ""}`
                : coiTarget.truck?.unitNumber ?? ""}
            </p>
            <Field label="COI File (PDF/PNG/JPG, max 10MB)">
              <input name="file" type="file" required className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100" />
            </Field>
            <Field label="Expiry Date (optional)">
              <input name="expiryDate" type="date" className="modal-input" />
            </Field>
            <ModalActions loading={loading} onCancel={() => setCoiTarget(null)} submitLabel="Upload" />
          </form>
        </Modal>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-fg mb-4">Add Insurance Policy</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg">Type</label>
                  <select className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                    <option value="OCC_ACC">OCC/ACC (Driver)</option>
                    <option value="PD_BOBTAIL">PD / Bobtail (Truck)</option>
                  </select>
                </div>
                
                {formData.type === 'OCC_ACC' ? (
                  <div>
                    <label className="block text-sm font-medium text-fg">Driver</label>
                    <select required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      value={formData.driverId} onChange={(e) => setFormData({...formData, driverId: e.target.value})}>
                      {drivers?.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-fg">Truck</label>
                    <select required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      value={formData.truckId} onChange={(e) => setFormData({...formData, truckId: e.target.value})}>
                      <option value="">None</option>
                      {trucks?.map(t => <option key={t.id} value={t.id}>{t.unitNumber}</option>)}
                    </select>
                  </div>
                )}


                <div>
                  <label className="block text-sm font-medium text-fg">End Date</label>
                  <input required type="date" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2">Cancel</button>
                <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {loading ? "Saving..." : "Save Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
