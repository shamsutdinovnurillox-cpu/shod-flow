"use client";

import { useState } from "react";
import { createInspection } from "@/app/actions/safety";
import { Plus } from "lucide-react";
import type { InspectionWithRefs, Driver, Truck, Trailer } from "@/types/models";

export function InspectionsClient({ initialInspections, drivers, trucks }: { initialInspections: InspectionWithRefs[], drivers: Driver[], trucks: Truck[], trailers: Trailer[] }) {
  const [inspections, setInspections] = useState(initialInspections);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      alert(error instanceof Error ? error.message : "Inspeksiyani saqlashda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg">Inspections</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          Log Inspection
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="bg-surface-2 text-fg">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Driver</th>
                <th className="px-6 py-4 font-medium">Unit(s)</th>
                <th className="px-6 py-4 font-medium">State</th>
                <th className="px-6 py-4 font-medium">Level</th>
                <th className="px-6 py-4 font-medium">Status</th>
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
                    <td className="px-6 py-4 font-medium text-fg">{new Date(insp.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">{insp.driver ? `${insp.driver.firstName} ${insp.driver.lastName}` : "Unknown"}</td>
                    <td className="px-6 py-4">
                      {insp.truck?.unitNumber}
                    </td>
                    <td className="px-6 py-4">{insp.state}</td>
                    <td className="px-6 py-4">Level {insp.level}</td>
                    <td className="px-6 py-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-fg mb-4">Log Inspection</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg">Driver</label>
                  <select required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.driverId} onChange={(e) => setFormData({...formData, driverId: e.target.value})}>
                    <option value="">Select Driver</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Truck</label>
                  <select required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.truckId} onChange={(e) => setFormData({...formData, truckId: e.target.value})}>
                    <option value="">Select Truck</option>
                    {trucks.map(t => <option key={t.id} value={t.id}>{t.unitNumber}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg">Date</label>
                  <input required type="date" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Level (1-7)</label>
                  <select className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.level} onChange={(e) => setFormData({...formData, level: parseInt(e.target.value)})}>
                    {[1, 2, 3, 4, 5, 6, 7].map(l => <option key={l} value={l}>Level {l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Status</label>
                  <select className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                    <option value="CLEAN">Clean</option>
                    <option value="VIOLATION">Violation(s)</option>
                    <option value="PENDING_REVIEW">Pending Review</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-fg">State</label>
                  <input required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-fg">Bonus / Penalty ($)</label>
                  <input type="number" step="0.01" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.bonusOrPenalty} onChange={(e) => setFormData({...formData, bonusOrPenalty: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-fg">Notes / Violations</label>
                  <textarea className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" rows={2}
                    value={formData.violations} onChange={(e) => setFormData({...formData, violations: e.target.value})} />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2">Cancel</button>
                <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {loading ? "Saving..." : "Save Inspection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
