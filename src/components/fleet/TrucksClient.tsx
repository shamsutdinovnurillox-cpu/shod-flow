"use client";

import { useState } from "react";
import Link from "next/link";
import { createTruck } from "@/app/actions/fleet";
import { Plus } from "lucide-react";
import type { Truck } from "@/types/models";

const VIEWS = [
  { key: "ALL", label: "All" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "UNASSIGNED", label: "Unassigned" },
  { key: "IN_SERVICE", label: "In Service" },
] as const;

export function TrucksClient({ initialTrucks }: { initialTrucks: Truck[] }) {
  const [trucks, setTrucks] = useState(initialTrucks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<(typeof VIEWS)[number]["key"]>("ALL");
  const [search, setSearch] = useState("");

  const filtered = trucks.filter((t) => {
    if (view !== "ALL" && t.status !== view) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return [t.unitNumber, t.vin, t.licensePlate, t.make].some((f) => f.toLowerCase().includes(q));
    }
    return true;
  });

  // Form state
  const [formData, setFormData] = useState({
    unitNumber: "",
    vin: "",
    licensePlate: "",
    make: "",
    year: new Date().getFullYear().toString(),
    ownershipType: "COMPANY",
    location: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newTruck = await createTruck(formData);
      setTrucks([newTruck, ...trucks]);
      setIsModalOpen(false);
      // Reset form
      setFormData({
        unitNumber: "",
        vin: "",
        licensePlate: "",
        make: "",
        year: new Date().getFullYear().toString(),
        ownershipType: "COMPANY",
        location: "",
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
        <h1 className="text-2xl font-semibold text-gray-900">Trucks</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Truck
        </button>
      </div>

      {/* Views + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === v.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter unit, VIN, plate…"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-6 py-4 font-medium">Unit #</th>
                <th className="px-6 py-4 font-medium">VIN</th>
                <th className="px-6 py-4 font-medium">Make / Year</th>
                <th className="px-6 py-4 font-medium">Plate</th>
                <th className="px-6 py-4 font-medium">Ownership</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No trucks found.
                  </td>
                </tr>
              ) : (
                filtered.map((truck) => (
                  <tr key={truck.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <Link href={`/fleet/trucks/${truck.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {truck.unitNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">{truck.vin}</td>
                    <td className="px-6 py-4">{truck.make} {truck.year}</td>
                    <td className="px-6 py-4">{truck.licensePlate}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                        {truck.ownershipType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                        {truck.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simple Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Truck</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit Number</label>
                  <input required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.unitNumber} onChange={(e) => setFormData({...formData, unitNumber: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">VIN</label>
                  <input required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.vin} onChange={(e) => setFormData({...formData, vin: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Make</label>
                  <input required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.make} onChange={(e) => setFormData({...formData, make: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Year</label>
                  <input required type="number" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">License Plate</label>
                  <input required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.licensePlate} onChange={(e) => setFormData({...formData, licensePlate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ownership Type</label>
                  <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.ownershipType} onChange={(e) => setFormData({...formData, ownershipType: e.target.value})}>
                    <option value="COMPANY">Company</option>
                    <option value="LEASED">Leased</option>
                    <option value="OWNER_OPERATOR">Owner Operator</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                    value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Cancel</button>
                <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {loading ? "Saving..." : "Save Truck"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
