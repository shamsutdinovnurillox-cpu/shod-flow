"use client";

import { showError } from "@/components/ui/toast";
import { useState } from "react";
import { createService, updateService, completeService } from "@/app/actions/services";
import { Plus } from "lucide-react";
import type { ServiceWithUnit, Truck, Trailer } from "@/types/models";
import { Modal, Field, ModalActions, money } from "@/components/ui/profile";

const emptyForm = () => ({
  entityType: "TRUCK",
  unitId: "",
  serviceDate: new Date().toISOString().split("T")[0],
  serviceType: "",
  shop: "",
  mechanic: "",
  cost: "",
  lessorPaid: false,
  odometer: "",
  description: "",
});

export function ServicesClient({ initialServices, trucks, trailers }: { initialServices: ServiceWithUnit[], trucks: Truck[], trailers: Trailer[] }) {
  const [services, setServices] = useState(initialServices);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceWithUnit | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState(emptyForm());
  const [editForm, setEditForm] = useState(emptyForm());

  const replaceInList = (updated: ServiceWithUnit) =>
    setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newService = await createService(formData);
      // Server allaqachon truck/trailer relation'larini qaytaradi.
      setServices([newService, ...services]);
      setIsModalOpen(false);
      setFormData(emptyForm());
    } catch (error) {
      console.error(error);
      showError(error instanceof Error ? error.message : "Amaliyot bajarilmadi.");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (service: ServiceWithUnit) => {
    setEditForm({
      lessorPaid: false,
      entityType: service.entityType,
      unitId: service.truckId ?? service.trailerId ?? "",
      serviceDate: new Date(service.serviceDate).toISOString().split("T")[0],
      serviceType: service.serviceType,
      shop: service.shop,
      mechanic: service.mechanic ?? "",
      cost: service.cost != null ? String(service.cost) : "",
      odometer: service.odometer != null ? String(service.odometer) : "",
      description: service.description ?? "",
    });
    setEditing(service);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setLoading(true);
    try {
      const updated = await updateService(editing.id, {
        serviceDate: editForm.serviceDate,
        serviceType: editForm.serviceType,
        shop: editForm.shop,
        mechanic: editForm.mechanic,
        cost: editForm.cost,
        odometer: editForm.odometer,
        description: editForm.description,
      });
      replaceInList(updated);
      setEditing(null);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Amaliyot bajarilmadi.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (service: ServiceWithUnit) => {
    if (!confirm(`Mark "${service.serviceType}" as completed?`)) return;
    try {
      const updated = await completeService(service.id);
      replaceInList(updated);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Amaliyot bajarilmadi.");
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
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted">
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
                    <td className="px-6 py-4">{service.cost != null ? money(service.cost) : "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        service.status === "COMPLETED" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                      }`}>
                        {service.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3 text-sm font-medium">
                        <button onClick={() => openEdit(service)} className="text-blue-600 hover:underline">Edit</button>
                        {service.status === "IN_PROGRESS" && (
                          <button onClick={() => handleComplete(service)} className="text-green-600 hover:underline">Complete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <Modal title="Add Service" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Asset Type">
                <select className="modal-input"
                  value={formData.entityType} onChange={(e) => setFormData({ ...formData, entityType: e.target.value, unitId: "" })}>
                  <option value="TRUCK">Truck</option>
                  <option value="TRAILER">Trailer</option>
                </select>
              </Field>
              <Field label="Unit">
                <select required className="modal-input"
                  value={formData.unitId} onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}>
                  <option value="">Select Unit</option>
                  {formData.entityType === "TRUCK" ? (
                    trucks.map(t => <option key={t.id} value={t.id}>{t.unitNumber}</option>)
                  ) : (
                    trailers.map(t => <option key={t.id} value={t.id}>{t.trailerNumber}</option>)
                  )}
                </select>
              </Field>
              <Field label="Service Type">
                <input required className="modal-input"
                  value={formData.serviceType} onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })} />
              </Field>
              <Field label="Date">
                <input required type="date" className="modal-input"
                  value={formData.serviceDate} onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })} />
              </Field>
              <Field label="Shop">
                <input required className="modal-input"
                  value={formData.shop} onChange={(e) => setFormData({ ...formData, shop: e.target.value })} />
              </Field>
              <Field label="Mechanic">
                <input className="modal-input"
                  value={formData.mechanic} onChange={(e) => setFormData({ ...formData, mechanic: e.target.value })} />
              </Field>
              <Field label="Cost ($)">
                <input required={!formData.lessorPaid} type="number" step="0.01" className="modal-input"
                  value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} />
              </Field>
              {formData.entityType === "TRUCK" && (
                <Field label="Odometer">
                  <input type="number" className="modal-input"
                    value={formData.odometer} onChange={(e) => setFormData({ ...formData, odometer: e.target.value })} />
                </Field>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-fg">
              <input type="checkbox" checked={formData.lessorPaid}
                onChange={(e) => setFormData({ ...formData, lessorPaid: e.target.checked })} />
              Rental / lessor-paid (cost optional)
            </label>
            <Field label="Description">
              <input className="modal-input"
                value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </Field>
            <ModalActions loading={loading} onCancel={() => setIsModalOpen(false)} submitLabel="Save Service" />
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Service" onClose={() => setEditing(null)}>
          <form onSubmit={handleEdit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Service Type">
                <input required className="modal-input"
                  value={editForm.serviceType} onChange={(e) => setEditForm({ ...editForm, serviceType: e.target.value })} />
              </Field>
              <Field label="Date">
                <input required type="date" className="modal-input"
                  value={editForm.serviceDate} onChange={(e) => setEditForm({ ...editForm, serviceDate: e.target.value })} />
              </Field>
              <Field label="Shop">
                <input required className="modal-input"
                  value={editForm.shop} onChange={(e) => setEditForm({ ...editForm, shop: e.target.value })} />
              </Field>
              <Field label="Mechanic">
                <input className="modal-input"
                  value={editForm.mechanic} onChange={(e) => setEditForm({ ...editForm, mechanic: e.target.value })} />
              </Field>
              <Field label="Cost ($)">
                <input type="number" step="0.01" className="modal-input"
                  value={editForm.cost} onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })} />
              </Field>
              {editForm.entityType === "TRUCK" && (
                <Field label="Odometer">
                  <input type="number" className="modal-input"
                    value={editForm.odometer} onChange={(e) => setEditForm({ ...editForm, odometer: e.target.value })} />
                </Field>
              )}
            </div>
            <Field label="Description">
              <input className="modal-input"
                value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </Field>
            <ModalActions loading={loading} onCancel={() => setEditing(null)} submitLabel="Save Changes" />
          </form>
        </Modal>
      )}
    </div>
  );
}
