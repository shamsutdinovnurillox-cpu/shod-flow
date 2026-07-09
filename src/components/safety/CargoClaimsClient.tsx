"use client";

import { showError } from "@/components/ui/toast";
import { useState } from "react";
import Link from "next/link";
import { createCargoClaim } from "@/app/actions/safety";
import { Plus } from "lucide-react";
import type { CargoClaimWithRefs, Driver, Truck } from "@/types/models";

export function CargoClaimsClient({ initialClaims, drivers, trucks }: { initialClaims: CargoClaimWithRefs[], drivers: Driver[], trucks: Truck[] }) {
  const [claims, setClaims] = useState(initialClaims);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const emptyForm = () => ({
    claimNumber: "",
    date: new Date().toISOString().split('T')[0],
    driverId: (drivers && drivers.length > 0) ? drivers[0].id : "",
    truckId: "",
    location: "",
    loadNumber: "",
    broker: "",
    adjuster: "",
    notes: "",
  });
  const [formData, setFormData] = useState(emptyForm());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newClaim = await createCargoClaim(formData);
      setClaims([newClaim, ...claims]);
      setIsModalOpen(false);
      setFormData(emptyForm());
    } catch (error) {
      showError(error instanceof Error ? error.message : "Da'voni saqlashda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg">Cargo Claims</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          File Claim
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="bg-surface-2 text-fg">
              <tr>
                <th className="px-6 py-4 font-medium">Claim #</th>
                <th className="px-6 py-4 font-medium">Driver</th>
                <th className="px-6 py-4 font-medium">Load #</th>
                <th className="px-6 py-4 font-medium">Notes</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {claims.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted">
                    No cargo claims filed.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <Link href={`/safety/cargo-claims/${claim.id}`} className="text-blue-600 hover:underline">
                        {claim.claimNumber || `#${claim.loadNumber}`}
                      </Link>
                    </td>
                    <td className="px-6 py-4">{claim.driver?.firstName} {claim.driver?.lastName}</td>
                    <td className="px-6 py-4">{claim.loadNumber}</td>
                    <td className="px-6 py-4 max-w-xs truncate">{claim.notes}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        claim.status === 'PENDING' ? 'bg-red-50 text-red-700' : 
                        claim.status === 'CLOSED' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {claim.status}
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
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-fg mb-4">File Cargo Claim</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg">Claim Number</label>
                  <input required type="text" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.claimNumber} onChange={(e) => setFormData({...formData, claimNumber: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Driver</label>
                  <select required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.driverId} onChange={(e) => setFormData({...formData, driverId: e.target.value})}>
                    {drivers?.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Truck (Optional)</label>
                  <select className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.truckId} onChange={(e) => setFormData({...formData, truckId: e.target.value})}>
                    <option value="">None</option>
                    {trucks?.map(t => <option key={t.id} value={t.id}>{t.unitNumber}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Location</label>
                  <input required type="text" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Load Number</label>
                  <input required type="text" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.loadNumber} onChange={(e) => setFormData({...formData, loadNumber: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Broker</label>
                  <input required type="text" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.broker} onChange={(e) => setFormData({...formData, broker: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Adjuster (Optional)</label>
                  <input type="text" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.adjuster} onChange={(e) => setFormData({...formData, adjuster: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-fg">Notes (Optional)</label>
                <textarea rows={4} className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                  value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2">Cancel</button>
                <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {loading ? "Saving..." : "Save Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
