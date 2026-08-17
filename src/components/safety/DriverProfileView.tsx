import Link from "next/link";
import { User, CreditCard, Truck } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { InfoCard, DetailPanel, Row, HistoryTable } from "@/components/ui/profile";
import { DriverActions } from "@/components/safety/DriverActions";
import type { DriverProfile, Document } from "@/types/models";

const DAY = 86400000;

function expiryLabel(date: Date | string) {
  const d = new Date(date);
  const diff = Math.round((d.getTime() - Date.now()) / DAY);
  const str = d.toLocaleDateString();
  if (diff < 0) return { str, cls: "text-red-600 font-semibold", tag: "expired" };
  if (diff <= 30) return { str, cls: "text-orange-600 font-semibold", tag: `${diff}d` };
  return { str, cls: "text-fg", tag: "" };
}

interface TimelineEvent {
  date: Date;
  label: string;
  href?: string;
}

/** Haydovchi hayotidagi voqealarni bitta xronologik ro'yxatga jamlaydi (PRD 5.2). */
function buildTimeline(driver: DriverProfile): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { date: new Date(driver.hireDate), label: "Hired" },
  ];
  if (driver.terminationDate) {
    events.push({ date: new Date(driver.terminationDate), label: "Terminated" });
  }
  for (const a of driver.accidents) {
    events.push({ date: new Date(a.date), label: `Accident — ${a.location} (${a.status})`, href: `/safety/accidents/${a.id}` });
  }
  for (const c of driver.cargoClaims) {
    events.push({ date: new Date(c.date), label: `Cargo claim ${c.claimNumber ?? c.loadNumber} (${c.status})`, href: `/safety/cargo-claims/${c.id}` });
  }
  for (const i of driver.inspections) {
    events.push({ date: new Date(i.date), label: `Inspection Level ${i.level} — ${i.state} (${i.status})`, href: `/safety/inspections/${i.id}` });
  }
  for (const a of driver.assignments) {
    const unit = a.truck?.unitNumber ?? a.trailer?.trailerNumber ?? "unit";
    events.push({ date: new Date(a.pickupDate), label: `Assigned to ${unit}` });
    if (a.dropoffDate) events.push({ date: new Date(a.dropoffDate), label: `Dropped ${unit}` });
  }
  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function DriverProfileView({ driver, documents }: { driver: DriverProfile; documents: Document[] }) {
  const active = driver.assignments.find((a) => a.isActive);
  const currentUnit = active?.truck?.unitNumber ?? active?.trailer?.trailerNumber ?? "—";
  const cdl = expiryLabel(driver.cdlExpiryDate);
  const med = expiryLabel(driver.medCardExpiryDate);
  const dqFiles = documents.filter((d) => d.type.toUpperCase().includes("DQ"));
  const timeline = buildTimeline(driver);

  const truckLink = (truck: { id: string; unitNumber: string } | null) =>
    truck ? (
      <Link href={`/fleet/trucks/${truck.id}`} className="text-blue-600 hover:underline">{truck.unitNumber}</Link>
    ) : ("—");

  return (
    <div className="space-y-8">
      {/* Haydovchi profiliga hodisa/da'vo/tekshiruv sahifalaridan ham kiriladi —
          shuning uchun manzil qat'iy: tarix foydalanuvchini begona bo'limga qaytarardi. */}
      <BackLink href="/safety/drivers" label="Back to Drivers" />

      <div className="flex flex-wrap items-center gap-4">
        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><User className="h-8 w-8" /></div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-fg">{driver.firstName} {driver.lastName}</h1>
          <p className="text-muted">Hired {new Date(driver.hireDate).toLocaleDateString()} · DOB {new Date(driver.dob).toLocaleDateString()}</p>
        </div>
        <span className={`ml-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${driver.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-surface-2 text-muted"}`}>
          {driver.status}
        </span>
        <DriverActions driver={driver} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <InfoCard icon={CreditCard} color="bg-blue-100 text-blue-600" label={`CDL (${driver.cdlState})`} value={driver.cdlNumber} />
        <div className="card p-5">
          <p className="text-xs font-medium text-muted">CDL Expiry</p>
          <p className={`text-lg font-bold ${cdl.cls}`}>{cdl.str} {cdl.tag && <span className="text-xs">({cdl.tag})</span>}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-muted">Medical Card Expiry</p>
          <p className={`text-lg font-bold ${med.cls}`}>{med.str} {med.tag && <span className="text-xs">({med.tag})</span>}</p>
        </div>
        <InfoCard icon={Truck} color="bg-indigo-100 text-indigo-600" label="Current Unit" value={currentUnit} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DetailPanel title="Insurance (OCC/ACC, PD/Bobtail)">
          {driver.insurances.length === 0 ? (
            <p className="text-sm text-muted py-4">No insurance records.</p>
          ) : driver.insurances.map((ins) => (
            <Row key={ins.id} k={ins.type} v={ins.expiryDate ? new Date(ins.expiryDate).toLocaleDateString() : ins.status} />
          ))}
        </DetailPanel>
        <DetailPanel title={`DQ Files (${dqFiles.length})`}>
          {dqFiles.length === 0 ? (
            <p className="text-sm text-muted py-4">No DQ files uploaded.</p>
          ) : (
            <ul className="divide-y divide-border">
              {dqFiles.map((d) => (
                <li key={d.id} className="py-2 flex items-center justify-between text-sm">
                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                    {d.fileName ?? d.type}
                  </a>
                  <span className="text-xs text-muted shrink-0 ml-2">{new Date(d.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </DetailPanel>
        <DetailPanel title="Notes">
          <p className="text-sm text-muted">{driver.notes || "—"}</p>
        </DetailPanel>
      </div>

      <HistoryTable
        title={`Accidents (${driver.accidents.length})`}
        head={["Date", "Unit", "Location", "Fault", "Status"]}
        rows={driver.accidents.map((a) => [
          <Link key={a.id} href={`/safety/accidents/${a.id}`} className="text-blue-600 hover:underline">{new Date(a.date).toLocaleDateString()}</Link>,
          truckLink(a.truck),
          a.location,
          a.fault,
          a.status,
        ])}
      />
      <HistoryTable
        title={`Cargo Claims (${driver.cargoClaims.length})`}
        head={["Date", "Unit", "Load #", "Broker", "Status"]}
        rows={driver.cargoClaims.map((c) => [
          <Link key={c.id} href={`/safety/cargo-claims/${c.id}`} className="text-blue-600 hover:underline">{new Date(c.date).toLocaleDateString()}</Link>,
          truckLink(c.truck),
          c.loadNumber,
          c.broker,
          c.status,
        ])}
      />
      <HistoryTable
        title={`Inspections (${driver.inspections.length})`}
        head={["Date", "Unit", "State", "Level", "Status"]}
        rows={driver.inspections.map((i) => [
          <Link key={i.id} href={`/safety/inspections/${i.id}`} className="text-blue-600 hover:underline">{new Date(i.date).toLocaleDateString()}</Link>,
          truckLink(i.truck),
          i.state,
          `Level ${i.level}`,
          i.status,
        ])}
      />
      <HistoryTable
        title={`Documents (${documents.length})`}
        head={["Type", "File Name", "Issued", "Expires", "File"]}
        rows={documents.map((d) => [
          d.type,
          d.fileName ?? "—",
          d.issueDate ? new Date(d.issueDate).toLocaleDateString() : "—",
          d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : "—",
          <a key={d.id} href={d.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">View</a>,
        ])}
      />

      <DetailPanel title={`Timeline (${timeline.length})`}>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted py-4">No events yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {timeline.map((ev, i) => (
              <li key={i} className="py-2.5 flex items-center justify-between text-sm">
                {ev.href ? (
                  <Link href={ev.href} className="text-blue-600 hover:underline">{ev.label}</Link>
                ) : (
                  <span className="text-fg">{ev.label}</span>
                )}
                <span className="text-xs text-muted shrink-0 ml-3">{ev.date.toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </DetailPanel>
    </div>
  );
}
