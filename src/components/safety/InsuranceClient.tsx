"use client";

import { useState } from "react";
import { createInsurance } from "@/app/actions/safety";
import { Plus } from "lucide-react";
import type { InsuranceWithRefs, Driver, Truck } from "@/types/models";

export function InsuranceClient({ initialInsurance, drivers, trucks }: { initialInsurance: InsuranceWithRefs[], drivers: Driver[], trucks: Truck[] }) {
  const [insurances, setInsurances] = useState(initialInsurance);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    type: "OCC_ACC",
    driverId: (drivers && drivers.length > 0) ? drivers[0].id : "",
    truckId: "",
    endDate: new Date().toISOString().split('T')[0],
  });

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
      alert(error instanceof Error ? error.message : "Sug'urta qo'shishda xatolik.");
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
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {insurances.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted">
                    No insurance policies found.
                  </td>
                </tr>
              ) : (
                insurances.map((ins) => {
                  const isExpired = ins.expiryDate ? new Date(ins.expiryDate) < new Date() : false;
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
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          ins.status === 'ACTIVE' && !isExpired ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {isExpired ? 'EXPIRED' : ins.status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
