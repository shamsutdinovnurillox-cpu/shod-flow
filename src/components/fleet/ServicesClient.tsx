"use client";

import { useState } from "react";
import { createService } from "@/app/actions/services";
import { Plus } from "lucide-react";
import type { ServiceWithUnit, Truck, Trailer } from "@/types/models";

export function ServicesClient({ initialServices, trucks, trailers }: { initialServices: ServiceWithUnit[], trucks: Truck[], trailers: Trailer[] }) {
  const [services, setServices] = useState(initialServices);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    entityType: "TRUCK",
    unitId: "",
    serviceDate: new Date().toISOString().split('T')[0],
    serviceType: "",
    shop: "",
    cost: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newService = await createService(formData);
      // Server allaqachon truck/trailer relation'larini qaytaradi.
      setServices([newService, ...services]);
      setIsModalOpen(false);
      setFormData({
        entityType: "TRUCK",
        unitId: "",
        serviceDate: new Date().toISOString().split('T')[0],
        serviceType: "",
        shop: "",
        cost: "",
        description: "",
      });
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Amaliyot bajarilmadi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg">Services</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Service
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="bg-surface-2 text-fg">
              <tr>
                <th className="px-6 py-4 font-medium">Unit</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Shop</th>
                <th className="px-6 py-4 font-medium">Cost</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted">
                    No services found.
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr key={service.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-6 py-4 font-medium text-fg">
                      {service.entityType === "TRUCK" ? `Truck: ${service.truck?.unitNumber}` : `Trailer: ${service.trailer?.trailerNumber}`}
                    </td>
                    <td className="px-6 py-4">{new Date(service.serviceDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4">{service.serviceType}</td>
                    <td className="px-6 py-4">{service.shop}</td>
                    <td className="px-6 py-4">${service.cost}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                        {service.status}
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
            <h2 className="text-xl font-bold text-fg mb-4">Add Service</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg">Asset Type</label>
                  <select className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.entityType} onChange={(e) => setFormData({...formData, entityType: e.target.value, unitId: ""})}>
                    <option value="TRUCK">Truck</option>
                    <option value="TRAILER">Trailer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Unit</label>
                  <select required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.unitId} onChange={(e) => setFormData({...formData, unitId: e.target.value})}>
                    <option value="">Select Unit</option>
                    {formData.entityType === "TRUCK" ? (
                      trucks.map(t => <option key={t.id} value={t.id}>{t.unitNumber}</option>)
                    ) : (
                      trailers.map(t => <option key={t.id} value={t.id}>{t.trailerNumber}</option>)
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Service Type</label>
                  <input required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.serviceType} onChange={(e) => setFormData({...formData, serviceType: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Date</label>
                  <input required type="date" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.serviceDate} onChange={(e) => setFormData({...formData, serviceDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Shop</label>
                  <input required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.shop} onChange={(e) => setFormData({...formData, shop: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Cost ($)</label>
                  <input required type="number" step="0.01" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-fg">Description</label>
                  <input className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2">Cancel</button>
                <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {loading ? "Saving..." : "Save Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
