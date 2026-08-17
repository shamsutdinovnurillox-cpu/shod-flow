"use client";

import { useState } from "react";
import { BackLink } from "@/components/ui/back-link";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Wrench,
  DollarSign,
  Gauge,
  CalendarDays,
  CheckCircle2,
  Pencil,
  Trash2,
  Truck as TruckIcon,
  Container,
} from "lucide-react";
import { showError } from "@/components/ui/toast";
import { updateService, completeService, deleteService } from "@/app/actions/services";
import { fmtDate, fmtDateTime } from "@/components/ui/expiry";
import {
  money,
  InfoCard,
  DetailPanel,
  Row,
  HistoryTable,
  Modal,
  ModalActions,
} from "@/components/ui/profile";
import {
  ServiceFormFields,
  ServiceFormLayout,
  ServiceRecordAside,
  validateServiceForm,
  type ServiceFormValues,
} from "./ServiceFormFields";
import type { ServiceWithUnit, AuditLogWithUser, Truck, Trailer } from "@/types/models";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
};

const toDateInput = (d: Date | string) => new Date(d).toISOString().split("T")[0];

/** Audit `details` JSON'ini "maydon: eski → yangi" ko'rinishida o'qiladigan qiladi. */
function formatAuditDetails(details: unknown): string {
  if (!details || typeof details !== "object") return "—";
  const entries = Object.entries(details as Record<string, unknown>);
  if (entries.length === 0) return "—";
  return entries
    .map(([field, change]) => {
      if (change && typeof change === "object" && "from" in change && "to" in change) {
        const c = change as { from: unknown; to: unknown };
        return `${field}: ${c.from ?? "—"} → ${c.to ?? "—"}`;
      }
      return `${field}: ${String(change)}`;
    })
    .join(" · ");
}

export function ServiceDetailClient({
  service,
  audit,
  trucks,
  trailers,
}: {
  service: ServiceWithUnit;
  audit: AuditLogWithUser[];
  trucks: Truck[];
  trailers: Trailer[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [modal, setModal] = useState<null | "edit">(null);
  const [loading, setLoading] = useState(false);
  // O'chirish faqat adminda (server ham requireAdmin bilan tekshiradi).
  const isAdmin = session?.user?.role === "ADMIN";

  const isTruck = service.entityType === "TRUCK";
  const unitNumber = isTruck ? service.truck?.unitNumber : service.trailer?.trailerNumber;
  const unitHref = isTruck
    ? service.truck && `/fleet/trucks/${service.truck.id}`
    : service.trailer && `/fleet/trailers/${service.trailer.id}`;

  const [editForm, setEditForm] = useState<ServiceFormValues>({
    entityType: service.entityType,
    unitId: service.truckId ?? service.trailerId ?? "",
    serviceType: service.serviceType,
    serviceDate: toDateInput(service.serviceDate),
    shop: service.shop,
    mechanic: service.mechanic ?? "",
    cost: service.cost != null ? String(service.cost) : "",
    // Narxi yo'q yozuv — demak rental/lessor to'lagan.
    lessorPaid: service.cost == null,
    odometer: service.odometer != null ? String(service.odometer) : "",
    description: service.description ?? "",
  });

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setLoading(true);
    try {
      await fn();
      setModal(null);
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    if (!confirm(`Mark "${service.serviceType}" as completed?`)) return;
    run(() => completeService(service.id), "Yakunlashda xatolik.");
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${service.serviceType}"? Bu amalni qaytarib bo'lmaydi.`)) return;
    setLoading(true);
    try {
      await deleteService(service.id);
      // Yozuv o'chdi — bu sahifa endi mavjud emas.
      router.push("/fleet/services");
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "O'chirishda xatolik.");
      setLoading(false);
    }
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateServiceForm(editForm);
    if (problem) {
      showError(problem);
      return;
    }
    run(() => updateService(service.id, editForm), "Saqlashda xatolik.");
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <BackLink href="/fleet/services" label="Back to Services" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-600">
            <Wrench className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
                {service.serviceType}
              </h1>
              <span className={cn("badge", STATUS_STYLES[service.status] ?? "badge-neutral")}>
                {service.status.replace("_", " ")}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {isTruck ? "Truck" : "Trailer"} {unitNumber ?? "—"} · {service.shop} ·{" "}
              {fmtDate(service.serviceDate)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {service.status === "IN_PROGRESS" && (
            <button onClick={handleComplete} disabled={loading} className="btn btn-primary">
              <CheckCircle2 className="h-4 w-4" />
              Complete
            </button>
          )}
          <button
            onClick={() => setModal("edit")}
            title="Edit service"
            aria-label="Edit service"
            className="btn btn-secondary btn-icon"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {isAdmin && (
            <button
              onClick={handleDelete}
              disabled={loading}
              title="Delete service"
              aria-label="Delete service"
              className="btn btn-secondary btn-icon text-danger hover:border-danger hover:bg-danger-soft"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <InfoCard
          icon={isTruck ? TruckIcon : Container}
          color={isTruck ? "bg-blue-100 text-blue-600" : "bg-indigo-100 text-indigo-600"}
          label="Unit"
          value={unitNumber ?? "—"}
        />
        <InfoCard
          icon={DollarSign}
          color="bg-teal-100 text-teal-600"
          label="Cost"
          value={service.cost != null ? money(service.cost) : "Lessor-paid"}
        />
        <InfoCard
          icon={CalendarDays}
          color="bg-purple-100 text-purple-600"
          label="Service Date"
          value={fmtDate(service.serviceDate)}
        />
        <InfoCard
          icon={Gauge}
          color="bg-amber-100 text-amber-600"
          label="Odometer"
          value={service.odometer != null ? service.odometer.toLocaleString() : "—"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DetailPanel title="Service Details">
          <Row k="Type" v={service.serviceType} />
          <Row k="Shop" v={service.shop} />
          <Row k="Mechanic" v={service.mechanic ?? "—"} />
          <Row k="Cost" v={service.cost != null ? money(service.cost) : "Lessor-paid"} />
          {isTruck && (
            <Row k="Odometer" v={service.odometer != null ? service.odometer.toLocaleString() : "—"} />
          )}
          <Row k="Arrival" v={fmtDateTime(service.arrivalTime)} />
          <Row k="Completed" v={fmtDateTime(service.completionTime)} />
        </DetailPanel>

        <DetailPanel
          title="Unit & Record"
          action={
            unitHref ? (
              <Link href={unitHref} className="text-sm font-medium text-blue-600 hover:underline">
                Open profile →
              </Link>
            ) : undefined
          }
        >
          <Row k="Asset type" v={isTruck ? "Truck" : "Trailer"} />
          <Row
            k="Unit"
            v={
              unitHref ? (
                <Link href={unitHref} className="text-blue-600 hover:underline">
                  {unitNumber}
                </Link>
              ) : (
                unitNumber ?? "—"
              )
            }
          />
          <Row k="Status" v={service.status.replace("_", " ")} />
          <Row k="Created" v={fmtDateTime(service.createdAt)} />
          <Row k="Last updated" v={fmtDateTime(service.updatedAt)} />
        </DetailPanel>
      </div>

      {service.description && (
        <DetailPanel title="Description">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{service.description}</p>
        </DetailPanel>
      )}

      <HistoryTable
        title={`Activity (${audit.length})`}
        head={["When", "Action", "User", "Changes"]}
        rows={audit.map((a) => [
          fmtDateTime(a.timestamp),
          a.action.replace("_", " "),
          a.user?.name ?? a.user?.email ?? "—",
          <span key={a.id} className="text-xs text-muted">
            {formatAuditDetails(a.details)}
          </span>,
        ])}
      />

      {/* Ro'yxatdagi forma bilan aynan bir xil — maydonlar umumiy komponentda. */}
      {modal === "edit" && (
        <Modal title="Edit Service" size="xl" onClose={() => setModal(null)}>
          <form onSubmit={handleEdit}>
            <ServiceFormLayout aside={<ServiceRecordAside service={service} />}>
              <ServiceFormFields
                value={editForm}
                onChange={(patch) => setEditForm({ ...editForm, ...patch })}
                trucks={trucks}
                trailers={trailers}
              />
            </ServiceFormLayout>

            <ModalActions loading={loading} onCancel={() => setModal(null)} submitLabel="Save Changes" />
          </form>
        </Modal>
      )}

    </div>
  );
}
