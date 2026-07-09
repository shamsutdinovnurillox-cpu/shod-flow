"use client";

import { showError } from "@/components/ui/toast";
import { useState } from "react";
import Link from "next/link";
import { createTrailer } from "@/app/actions/fleet";
import { Plus } from "lucide-react";
import type { Trailer } from "@/types/models";

export function TrailersClient({ initialTrailers }: { initialTrailers: Trailer[] }) {
  const [trailers, setTrailers] = useState(initialTrailers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    trailerNumber: "",
    vin: "",
    year: new Date().getFullYear().toString(),
    make: "",
    licensePlate: "",
    state: "",
    location: "",
    pickupDate: new Date().toISOString().split('T')[0],
    annualInspectionDate: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newTrailer = await createTrailer(formData);
      setTrailers([newTrailer, ...trailers]);
      setIsModalOpen(false);
      setFormData({
        trailerNumber: "",
        vin: "",
        year: new Date().getFullYear().toString(),
        make: "",
        licensePlate: "",
        state: "",
        location: "",
        pickupDate: new Date().toISOString().split('T')[0],
        annualInspectionDate: new Date().toISOString().split('T')[0],
      });
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
        <h1 className="text-2xl font-semibold text-fg">Trailers</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Trailer
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="bg-surface-2 text-fg">
              <tr>
                <th className="px-6 py-4 font-medium">Trailer #</th>
                <th className="px-6 py-4 font-medium">VIN</th>
                <th className="px-6 py-4 font-medium">Make / Year</th>
                <th className="px-6 py-4 font-medium">Plate / State</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {trailers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted">
                    No trailers found.
                  </td>
                </tr>
              ) : (
                trailers.map((trailer) => (
                  <tr key={trailer.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <Link href={`/fleet/trailers/${trailer.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {trailer.trailerNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">{trailer.vin}</td>
                    <td className="px-6 py-4">{trailer.make} {trailer.year}</td>
                    <td className="px-6 py-4">{trailer.licensePlate} / {trailer.state}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-surface-2 px-2 py-1 text-xs font-semibold text-muted">
                        {trailer.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-fg mb-4">Add New Trailer</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg">Trailer Number</label>
                  <input required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.trailerNumber} onChange={(e) => setFormData({...formData, trailerNumber: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">VIN</label>
                  <input required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.vin} onChange={(e) => setFormData({...formData, vin: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Make</label>
                  <input required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.make} onChange={(e) => setFormData({...formData, make: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Year</label>
                  <input required type="number" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">License Plate</label>
                  <input required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.licensePlate} onChange={(e) => setFormData({...formData, licensePlate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">State</label>
                  <input required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Pickup Date</label>
                  <input required type="date" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.pickupDate} onChange={(e) => setFormData({...formData, pickupDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Annual Insp. Date</label>
                  <input required type="date" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.annualInspectionDate} onChange={(e) => setFormData({...formData, annualInspectionDate: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-fg">Location</label>
                  <input required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2">Cancel</button>
                <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {loading ? "Saving..." : "Save Trailer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
