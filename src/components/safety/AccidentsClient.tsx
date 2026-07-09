"use client";

import { showError } from "@/components/ui/toast";
import { useState } from "react";
import Link from "next/link";
import { createAccident } from "@/app/actions/safety";
import { Plus } from "lucide-react";
import type { AccidentWithRefs, Driver, Truck } from "@/types/models";

export function AccidentsClient({ initialAccidents, drivers, trucks }: { initialAccidents: AccidentWithRefs[], drivers: Driver[], trucks: Truck[] }) {
  const [accidents, setAccidents] = useState(initialAccidents);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const emptyForm = () => ({
    driverId: "",
    truckId: "",
    date: new Date().toISOString().split('T')[0],
    location: "",
    fault: "NOT_SPECIFIED",
    postAccidentTestDone: false,
    claimNumber: "",
    adjuster: "",
    description: "",
  });
  const [formData, setFormData] = useState(emptyForm());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newAccident = await createAccident(formData);
      // Server allaqachon driver/truck relation'larini qaytaradi.
      setAccidents([newAccident, ...accidents]);
      setIsModalOpen(false);
      setFormData(emptyForm());
    } catch (error) {
      console.error(error);
      showError(error instanceof Error ? error.message : "Amaliyot bajarilmadi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg">Accidents</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          Log Accident
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="bg-surface-2 text-fg">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Driver</th>
                <th className="px-6 py-4 font-medium">Truck</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Claim #</th>
                <th className="px-6 py-4 font-medium">Post-Acc. Test</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted">
                    No accidents logged.
                  </td>
                </tr>
              ) : (
                accidents.map((accident) => (
                  <tr key={accident.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <Link href={`/safety/accidents/${accident.id}`} className="text-blue-600 hover:underline">
                        {new Date(accident.date).toLocaleDateString()}
                      </Link>
                    </td>
                    <td className="px-6 py-4">{accident.driver ? `${accident.driver.firstName} ${accident.driver.lastName}` : "Unknown"}</td>
                    <td className="px-6 py-4">{accident.truck ? accident.truck.unitNumber : "N/A"}</td>
                    <td className="px-6 py-4">{accident.location}</td>
                    <td className="px-6 py-4">{accident.claimNumber ?? "—"}</td>
                    <td className="px-6 py-4">
                      {accident.postAccidentTestDone ? (
                        <span className="inline-flex rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">Done</span>
                      ) : (
                        <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        accident.status === 'PENDING' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                      }`}>
                        {accident.status}
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
            <h2 className="text-xl font-bold text-fg mb-4">Log Accident</h2>
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
                  <label className="block text-sm font-medium text-fg">Fault</label>
                  <select className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.fault} onChange={(e) => setFormData({...formData, fault: e.target.value})}>
                    <option value="NOT_SPECIFIED">Not specified</option>
                    <option value="AT_FAULT">At fault</option>
                    <option value="NOT_AT_FAULT">Not at fault</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Claim Number</label>
                  <input className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.claimNumber} onChange={(e) => setFormData({...formData, claimNumber: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Adjuster</label>
                  <input className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.adjuster} onChange={(e) => setFormData({...formData, adjuster: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-fg">Location</label>
                  <input required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-fg">
                    <input type="checkbox" checked={formData.postAccidentTestDone}
                      onChange={(e) => setFormData({...formData, postAccidentTestDone: e.target.checked})} />
                    Post-accident test completed
                  </label>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-fg">Description</label>
                  <textarea required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" rows={3}
                    value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2">Cancel</button>
                <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {loading ? "Saving..." : "Save Accident"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
