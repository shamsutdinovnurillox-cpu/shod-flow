"use client";

import { Modal } from "@/components/ui/profile";
import { showError } from "@/components/ui/toast";
import { useState } from "react";
import Link from "next/link";
import { createTrailer } from "@/app/actions/fleet";
import { Plus } from "lucide-react";
import type { Trailer } from "@/types/models";
import { useOpenOnNewParam } from "@/components/ui/use-new-param";
import { PageHeader } from "@/components/ui/page-header";

export function TrailersClient({ initialTrailers }: { initialTrailers: Trailer[] }) {
  const [trailers, setTrailers] = useState(initialTrailers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Dashboard tezkor amali (`?new=1`) bilan kelinganda modal o'zi ochiladi.
  useOpenOnNewParam(() => setIsModalOpen(true));
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
      <PageHeader
        title="Trailers"
        actions={
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            <Plus className="h-4 w-4" />
            Add Trailer
          </button>
        }
      />

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="border-b border-border bg-surface-2/70">
              <tr>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Trailer #</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">VIN</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Make / Year</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Plate / State</th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6">Status</th>
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
                    <td className="px-5 py-3.5 sm:px-6 font-medium">
                      <Link href={`/fleet/trailers/${trailer.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {trailer.trailerNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 sm:px-6">{trailer.vin}</td>
                    <td className="px-5 py-3.5 sm:px-6">{trailer.make} {trailer.year}</td>
                    <td className="px-5 py-3.5 sm:px-6">{trailer.licensePlate} / {trailer.state}</td>
                    <td className="px-5 py-3.5 sm:px-6">
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
        <Modal title="Add New Trailer" size="lg" onClose={() => setIsModalOpen(false)}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Trailer Number</label>
                  <input required className="modal-input" 
                    value={formData.trailerNumber} onChange={(e) => setFormData({...formData, trailerNumber: e.target.value})} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">VIN</label>
                  <input required className="modal-input" 
                    value={formData.vin} onChange={(e) => setFormData({...formData, vin: e.target.value})} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Make</label>
                  <input required className="modal-input" 
                    value={formData.make} onChange={(e) => setFormData({...formData, make: e.target.value})} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Year</label>
                  <input required type="number" className="modal-input" 
                    value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">License Plate</label>
                  <input required className="modal-input" 
                    value={formData.licensePlate} onChange={(e) => setFormData({...formData, licensePlate: e.target.value})} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">State</label>
                  <input required className="modal-input" 
                    value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Pickup Date</label>
                  <input required type="date" className="modal-input" 
                    value={formData.pickupDate} onChange={(e) => setFormData({...formData, pickupDate: e.target.value})} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Annual Insp. Date</label>
                  <input required type="date" className="modal-input" 
                    value={formData.annualInspectionDate} onChange={(e) => setFormData({...formData, annualInspectionDate: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-fg">Location</label>
                  <input required className="modal-input" 
                    value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? "Saving..." : "Save Trailer"}
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
