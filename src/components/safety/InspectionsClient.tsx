"use client";

import { Modal } from "@/components/ui/profile";
import { showError } from "@/components/ui/toast";
import { useState } from "react";
import Link from "next/link";
import { createInspection } from "@/app/actions/safety";
import { Plus } from "lucide-react";
import type { InspectionWithRefs, Driver, Truck, Trailer } from "@/types/models";
import { useOpenOnNewParam } from "@/components/ui/use-new-param";

export function InspectionsClient({ initialInspections, drivers, trucks }: { initialInspections: InspectionWithRefs[], drivers: Driver[], trucks: Truck[], trailers: Trailer[] }) {
  const [inspections, setInspections] = useState(initialInspections);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Dashboard tezkor amali (`?new=1`) bilan kelinganda modal o'zi ochiladi.
  useOpenOnNewParam(() => setIsModalOpen(true));
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    driverId: (drivers && drivers.length > 0) ? drivers[0].id : "",
    truckId: "",
    date: new Date().toISOString().split('T')[0],
    state: "",
    level: 1,
    status: "CLEAN",
    violations: "",
    bonusOrPenalty: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newInspection = await createInspection(formData);
      // Server allaqachon driver/truck relation'larini qaytaradi.
      setInspections([newInspection, ...inspections]);
      setIsModalOpen(false);
      setFormData({
        driverId: (drivers && drivers.length > 0) ? drivers[0].id : "",
        truckId: "",
        date: new Date().toISOString().split('T')[0],
        state: "",
        level: 1,
        status: "CLEAN",
        violations: "",
        bonusOrPenalty: "",
        notes: "",
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : "Inspeksiyani saqlashda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Inspections</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4" />
          Log Inspection
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="border-b border-border bg-surface-2/70">
              <tr>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Date</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Driver</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Unit(s)</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">State</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Level</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inspections.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted">
                    No inspections logged.
                  </td>
                </tr>
              ) : (
                inspections.map((insp) => (
                  <tr key={insp.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-5 py-3.5 sm:px-6 font-medium">
                      <Link href={`/safety/inspections/${insp.id}`} className="text-blue-600 hover:underline">
                        {new Date(insp.date).toLocaleDateString()}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 sm:px-6">{insp.driver ? `${insp.driver.firstName} ${insp.driver.lastName}` : "Unknown"}</td>
                    <td className="px-5 py-3.5 sm:px-6">
                      {insp.truck?.unitNumber}
                    </td>
                    <td className="px-5 py-3.5 sm:px-6">{insp.state}</td>
                    <td className="px-5 py-3.5 sm:px-6">Level {insp.level}</td>
                    <td className="px-5 py-3.5 sm:px-6">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        insp.status === 'CLEAN' ? 'bg-green-50 text-green-700' : 
                        insp.status === 'VIOLATION' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {insp.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <Modal title="Log Inspection" size="lg" onClose={() => setIsModalOpen(false)}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Driver</label>
                  <select required className="modal-input"
                    value={formData.driverId} onChange={(e) => setFormData({...formData, driverId: e.target.value})}>
                    <option value="">Select Driver</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Truck</label>
                  <select required className="modal-input"
                    value={formData.truckId} onChange={(e) => setFormData({...formData, truckId: e.target.value})}>
                    <option value="">Select Truck</option>
                    {trucks.map(t => <option key={t.id} value={t.id}>{t.unitNumber}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Date</label>
                  <input required type="date" className="modal-input" 
                    value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Level (1-7)</label>
                  <select className="modal-input"
                    value={formData.level} onChange={(e) => setFormData({...formData, level: parseInt(e.target.value)})}>
                    {[1, 2, 3, 4, 5, 6, 7].map(l => <option key={l} value={l}>Level {l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Status</label>
                  <select className="modal-input"
                    value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                    <option value="CLEAN">Clean</option>
                    <option value="VIOLATION">Violation(s)</option>
                    <option value="PENDING_REVIEW">Pending Review</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-fg">State</label>
                  <input required className="modal-input" 
                    value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-fg">Bonus / Penalty ($)</label>
                  <input type="number" step="0.01" className="modal-input" 
                    value={formData.bonusOrPenalty} onChange={(e) => setFormData({...formData, bonusOrPenalty: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-fg">Notes / Violations</label>
                  <textarea className="modal-input" rows={2}
                    value={formData.violations} onChange={(e) => setFormData({...formData, violations: e.target.value})} />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? "Saving..." : "Save Inspection"}
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
