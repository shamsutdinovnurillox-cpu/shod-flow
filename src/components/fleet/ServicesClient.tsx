"use client";

import { showError } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/page-header";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { createServices, updateService, completeService, deleteService } from "@/app/actions/services";
import {
  Plus,
  ShoppingCart,
  Trash2,
  ChevronRight,
  Wrench,
  Pencil,
  CheckCircle2,
  Check,
} from "lucide-react";
import type { ServiceWithUnit, Truck, Trailer } from "@/types/models";
import { Modal, ModalActions, money } from "@/components/ui/profile";
import {
  ServiceFormFields,
  ServiceFormLayout,
  ServiceAside,
  ServiceRecordAside,
  emptyServiceForm,
  validateServiceForm,
  type ServiceFormValues,
} from "./ServiceFormFields";
import { cn } from "@/lib/utils";
import { useOpenOnNewParam } from "@/components/ui/use-new-param";

/** Savatdagi yozuv — forma qiymatlari + ro'yxatda ajratish uchun lokal kalit. */
interface CartItem extends ServiceFormValues {
  key: number;
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
};

export function ServicesClient({
  initialServices,
  trucks,
  trailers,
}: {
  initialServices: ServiceWithUnit[];
  trucks: Truck[];
  trailers: Trailer[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  // O'chirish faqat adminda (server ham requireAdmin bilan tekshiradi).
  const isAdmin = session?.user?.role === "ADMIN";
  const [services, setServices] = useState(initialServices);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Dashboard tezkor amali (`?new=1`) bilan kelinganda modal o'zi ochiladi.
  useOpenOnNewParam(() => setIsModalOpen(true));
  const [editing, setEditing] = useState<ServiceWithUnit | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState(emptyServiceForm());
  const [editForm, setEditForm] = useState(emptyServiceForm());
  const [cart, setCart] = useState<CartItem[]>([]);
  /** Inline ro'yxatidagi qaysi yozuv hozir formada tahrirlanayotgani. */
  const [editingKey, setEditingKey] = useState<number | null>(null);

  const replaceInList = (updated: ServiceWithUnit) =>
    setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

  const unitLabel = (f: ServiceFormValues) => {
    if (f.entityType === "TRUCK") {
      const t = trucks.find((u) => u.id === f.unitId);
      return t ? `Truck ${t.unitNumber}` : "—";
    }
    const t = trailers.find((u) => u.id === f.unitId);
    return t ? `Trailer ${t.trailerNumber}` : "—";
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(emptyServiceForm());
    setCart([]);
    setEditingKey(null);
  };

  /** Keyingi yozuv uchun formani tozalaydi (unit va sana saqlanib qoladi). */
  const clearEntry = () =>
    setFormData((f) => ({
      ...f,
      serviceType: "",
      shop: "",
      mechanic: "",
      cost: "",
      lessorPaid: false,
      odometer: "",
      description: "",
    }));

  /**
   * Formadagi yozuvni ro'yxatga qo'shadi — yoki tahrirlanayotgan bo'lsa,
   * o'sha yozuvni yangilaydi.
   */
  const addToCart = () => {
    const problem = validateServiceForm(formData);
    if (problem) {
      showError(problem);
      return;
    }
    if (editingKey !== null) {
      setCart((prev) => prev.map((i) => (i.key === editingKey ? { ...formData, key: editingKey } : i)));
      setEditingKey(null);
    } else {
      setCart((prev) => [...prev, { ...formData, key: prev.length ? prev[prev.length - 1].key + 1 : 1 }]);
    }
    // Unit va sana saqlanadi — bir unitga ketma-ket bir necha xizmat kiritish tez bo'ladi.
    clearEntry();
  };

  /** Ro'yxatdagi yozuvni formaga qaytaradi. */
  const editCartItem = (item: CartItem) => {
    setFormData({ ...item });
    setEditingKey(item.key);
  };

  const cancelCartEdit = () => {
    setEditingKey(null);
    clearEntry();
  };

  const removeFromCart = (key: number) => {
    setCart((prev) => prev.filter((i) => i.key !== key));
    if (key === editingKey) cancelCartEdit();
  };

  const cartTotal = cart.reduce((sum, i) => sum + (Number(i.cost) || 0), 0);
  /**
   * Formaga yangi yozuv kiritila boshlanganmi. Unit va sana qo'shishdan keyin
   * ham qolib ketadi, shuning uchun ular hisobga olinmaydi — aks holda bo'sh
   * forma ham "to'ldirilgan" deb sanalardi.
   */
  const formTouched = Boolean(
    formData.serviceType.trim() ||
      formData.shop.trim() ||
      formData.mechanic.trim() ||
      formData.cost ||
      formData.odometer ||
      formData.description.trim(),
  );
  // Tahrirlanayotgan yozuv allaqachon ro'yxatda — u qayta sanalmaydi.
  const pendingCount = cart.length + (formTouched && editingKey === null ? 1 : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Foydalanuvchi savatga qo'shmasdan to'g'ridan-to'g'ri "Save" bosishi mumkin —
    // to'ldirilgan forma yo'qolib qolmasligi uchun avval savatga qo'shiladi.
    let items: CartItem[] = cart;
    if (formTouched) {
      const problem = validateServiceForm(formData);
      if (problem) {
        showError(problem);
        return;
      }
      items =
        editingKey !== null
          ? cart.map((i) => (i.key === editingKey ? { ...formData, key: editingKey } : i))
          : [...cart, { ...formData, key: -1 }];
    }
    if (items.length === 0) {
      showError("Inline is empty — add at least one service.");
      return;
    }

    setLoading(true);
    try {
      const created = await createServices(items);
      // Server truck/trailer relation'larini qaytaradi — ro'yxat darhol yangilanadi.
      setServices([...created].reverse().concat(services));
      closeModal();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Amaliyot bajarilmadi.");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (service: ServiceWithUnit) => {
    setEditForm({
      // Narxi yo'q yozuv — demak rental/lessor to'lagan; belgini tiklaymiz,
      // aks holda forma narxni majburiy deb hisoblab qolardi.
      lessorPaid: service.cost == null,
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
      const problem = validateServiceForm(editForm);
      if (problem) {
        showError(problem);
        return;
      }
      const updated = await updateService(editing.id, editForm);
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

  const handleDelete = async (service: ServiceWithUnit) => {
    if (!confirm(`Delete "${service.serviceType}"? Bu amalni qaytarib bo'lmaydi.`)) return;
    setDeleting(service.id);
    try {
      await deleteService(service.id);
      setServices((prev) => prev.filter((s) => s.id !== service.id));
    } catch (error) {
      showError(error instanceof Error ? error.message : "O'chirishda xatolik.");
    } finally {
      setDeleting(null);
    }
  };

  const openDetail = (id: string) => router.push(`/fleet/services/${id}`);

  const TH = "whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:px-6";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        subtitle={`${services.length} ${services.length === 1 ? "record" : "records"} · maintenance history`}
        actions={
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            <Plus className="h-4 w-4" />
            Add Service
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="border-b border-border bg-surface-2/70">
              <tr>
                <th className={TH}>Unit</th>
                <th className={TH}>Date</th>
                <th className={TH}>Type</th>
                <th className={TH}>Shop</th>
                <th className={TH}>Cost</th>
                <th className={TH}>Status</th>
                <th className={TH}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <Wrench className="mx-auto h-8 w-8 text-faint" />
                    <p className="mt-3 text-sm font-medium text-fg">No services yet</p>
                    <p className="mt-1 text-sm text-muted">Add the first maintenance record to get started.</p>
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr
                    key={service.id}
                    onClick={() => openDetail(service.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        openDetail(service.id);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open service ${service.serviceType}`}
                    className="row-link group"
                  >
                    <td className="px-5 py-3.5 font-medium text-fg sm:px-6">
                      {service.entityType === "TRUCK"
                        ? `Truck: ${service.truck?.unitNumber}`
                        : `Trailer: ${service.trailer?.trailerNumber}`}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 sm:px-6">
                      {new Date(service.serviceDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 sm:px-6">{service.serviceType}</td>
                    <td className="px-5 py-3.5 sm:px-6">{service.shop}</td>
                    <td className="px-5 py-3.5 tabular-nums sm:px-6">
                      {service.cost != null ? money(service.cost) : "—"}
                    </td>
                    <td className="px-5 py-3.5 sm:px-6">
                      <span className={cn("badge", STATUS_STYLES[service.status] ?? "badge-neutral")}>
                        {service.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 sm:px-6">
                      {/* Qator bosilganda detail ochiladi — amal tugmalari uni to'xtatadi. */}
                      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        {service.status === "IN_PROGRESS" && (
                          <button
                            onClick={() => handleComplete(service)}
                            title="Mark as completed"
                            aria-label="Mark as completed"
                            className="btn btn-ghost btn-icon h-8 w-8 hover:bg-success-soft hover:text-success"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(service)}
                          title="Edit service"
                          aria-label="Edit service"
                          className="btn btn-ghost btn-icon h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(service)}
                            disabled={deleting === service.id}
                            title="Delete service"
                            aria-label="Delete service"
                            className="btn btn-ghost btn-icon h-8 w-8 hover:bg-danger-soft hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <ChevronRight className="ml-0.5 h-4 w-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-muted" />
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
        <Modal
          title="Add Services"
          description="Add several services inline and save them in one go."
          size="xl"
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit}>
            <ServiceFormLayout
              aside={
                <ServiceAside
                  icon={ShoppingCart}
                  title="Inline"
                  badge={<span className="badge badge-primary">{cart.length}</span>}
                  footerLabel="Total cost"
                  footerValue={money(cartTotal)}
                >
                  {cart.length === 0 ? (
                    <div className="px-3 py-10 text-center">
                      <ShoppingCart className="mx-auto h-7 w-7 text-faint" />
                      <p className="mt-2.5 text-sm text-muted">Nothing added yet</p>
                      <p className="mt-1 text-xs text-faint">
                        Fill the form and press &laquo;Add inline&raquo;.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-1.5">
                      {cart.map((item) => (
                        <li
                          key={item.key}
                          className={cn(
                            "flex animate-slide-up items-start gap-2 rounded-lg border bg-surface p-2.5 transition-colors",
                            // Formada ochilgan yozuv ajratib ko'rsatiladi.
                            item.key === editingKey
                              ? "border-primary bg-primary-soft"
                              : "border-border"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-fg">{item.serviceType}</p>
                            <p className="truncate text-xs text-muted">
                              {unitLabel(item)} · {item.shop}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-medium tabular-nums text-fg">
                            {item.cost ? money(Number(item.cost)) : "—"}
                          </span>
                          <div className="flex shrink-0 gap-0.5">
                            <button
                              type="button"
                              onClick={() => editCartItem(item)}
                              title="Edit"
                              aria-label="Edit inline item"
                              className="btn btn-ghost btn-icon h-7 w-7"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.key)}
                              title="Remove"
                              aria-label="Remove inline item"
                              className="btn btn-ghost btn-icon h-7 w-7 hover:bg-danger-soft hover:text-danger"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </ServiceAside>
              }
            >
              <ServiceFormFields
                value={formData}
                onChange={(patch) => setFormData({ ...formData, ...patch })}
                trucks={trucks}
                trailers={trailers}
              />

              <div className="flex gap-2">
                <button type="button" onClick={addToCart} className="btn btn-secondary flex-1">
                  {editingKey === null ? (
                    <>
                      <Plus className="h-4 w-4" />
                      Add inline
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Update inline item
                    </>
                  )}
                </button>
                {editingKey !== null && (
                  <button type="button" onClick={cancelCartEdit} className="btn btn-ghost">
                    Cancel
                  </button>
                )}
              </div>
            </ServiceFormLayout>

            <ModalActions
              loading={loading}
              onCancel={closeModal}
              submitLabel={pendingCount > 1 ? `Save ${pendingCount} services` : "Save Service"}
            >
              <span className="text-xs text-muted">
                {cart.length > 0
                  ? `${cart.length} ${cart.length === 1 ? "item" : "items"} inline`
                  : "Nothing added yet"}
              </span>
            </ModalActions>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Service" size="xl" onClose={() => setEditing(null)}>
          <form onSubmit={handleEdit}>
            <ServiceFormLayout aside={<ServiceRecordAside service={editing} />}>
              <ServiceFormFields
                value={editForm}
                onChange={(patch) => setEditForm({ ...editForm, ...patch })}
                trucks={trucks}
                trailers={trailers}
              />
            </ServiceFormLayout>

            <ModalActions loading={loading} onCancel={() => setEditing(null)} submitLabel="Save Changes" />
          </form>
        </Modal>
      )}

    </div>
  );
}
