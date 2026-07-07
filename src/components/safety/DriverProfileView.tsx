import Link from "next/link";
import { ArrowLeft, User, CreditCard, Truck } from "lucide-react";
import { InfoCard, DetailPanel, Row, HistoryTable } from "@/components/ui/profile";
import type { DriverProfile, Document } from "@/types/models";

const DAY = 86400000;

function expiryLabel(date: Date | string) {
  const d = new Date(date);
  const diff = Math.round((d.getTime() - Date.now()) / DAY);
  const str = d.toLocaleDateString();
  if (diff < 0) return { str, cls: "text-red-600 font-semibold", tag: "expired" };
  if (diff <= 30) return { str, cls: "text-orange-600 font-semibold", tag: `${diff}d` };
  return { str, cls: "text-gray-900", tag: "" };
}

export function DriverProfileView({ driver, documents }: { driver: DriverProfile; documents: Document[] }) {
  const active = driver.assignments[0];
  const currentUnit = active?.truck?.unitNumber ?? active?.trailer?.trailerNumber ?? "—";
  const cdl = expiryLabel(driver.cdlExpiryDate);
  const med = expiryLabel(driver.medCardExpiryDate);

  return (
    <div className="space-y-8">
      <Link href="/safety/drivers" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Back to Drivers
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><User className="h-8 w-8" /></div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{driver.firstName} {driver.lastName}</h1>
          <p className="text-gray-500">Hired {new Date(driver.hireDate).toLocaleDateString()} · DOB {new Date(driver.dob).toLocaleDateString()}</p>
        </div>
        <span className={`ml-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${driver.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
          {driver.status}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <InfoCard icon={CreditCard} color="bg-blue-100 text-blue-600" label={`CDL (${driver.cdlState})`} value={driver.cdlNumber} />
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500">CDL Expiry</p>
          <p className={`text-lg font-bold ${cdl.cls}`}>{cdl.str} {cdl.tag && <span className="text-xs">({cdl.tag})</span>}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Medical Card Expiry</p>
          <p className={`text-lg font-bold ${med.cls}`}>{med.str} {med.tag && <span className="text-xs">({med.tag})</span>}</p>
        </div>
        <InfoCard icon={Truck} color="bg-indigo-100 text-indigo-600" label="Current Unit" value={currentUnit} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DetailPanel title="Insurance (OCC/ACC, PD/Bobtail)">
          {driver.insurances.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No insurance records.</p>
          ) : driver.insurances.map((ins) => (
            <Row key={ins.id} k={ins.type} v={ins.expiryDate ? new Date(ins.expiryDate).toLocaleDateString() : ins.status} />
          ))}
        </DetailPanel>
        <DetailPanel title="Notes">
          <p className="text-sm text-gray-600">{driver.notes || "—"}</p>
        </DetailPanel>
      </div>

      <HistoryTable
        title={`Accidents (${driver.accidents.length})`}
        head={["Date", "Unit", "Location", "Fault", "Status"]}
        rows={driver.accidents.map((a) => [new Date(a.date).toLocaleDateString(), a.truck?.unitNumber ?? "—", a.location, a.fault, a.status])}
      />
      <HistoryTable
        title={`Cargo Claims (${driver.cargoClaims.length})`}
        head={["Date", "Unit", "Load #", "Broker", "Status"]}
        rows={driver.cargoClaims.map((c) => [new Date(c.date).toLocaleDateString(), c.truck?.unitNumber ?? "—", c.loadNumber, c.broker, c.status])}
      />
      <HistoryTable
        title={`Inspections (${driver.inspections.length})`}
        head={["Date", "Unit", "State", "Level", "Status"]}
        rows={driver.inspections.map((i) => [new Date(i.date).toLocaleDateString(), i.truck?.unitNumber ?? "—", i.state, `Level ${i.level}`, i.status])}
      />
      <HistoryTable
        title={`Documents (${documents.length})`}
        head={["Type", "Issued", "Expires", "File"]}
        rows={documents.map((d) => [
          d.type,
          d.issueDate ? new Date(d.issueDate).toLocaleDateString() : "—",
          d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : "—",
          <a key={d.id} href={d.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">View</a>,
        ])}
      />
    </div>
  );
}
