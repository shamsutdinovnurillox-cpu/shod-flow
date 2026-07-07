"use client";

import { useState } from "react";
import Link from "next/link";
import { createDriver } from "@/app/actions/safety";
import { Plus } from "lucide-react";
import type { Driver } from "@/types/models";

const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  firstName: "",
  lastName: "",
  dob: "",
  cdlNumber: "",
  cdlState: "",
  cdlIssueDate: "",
  cdlExpiryDate: today(),
  medCardExpiryDate: today(),
  hireDate: today(),
  notes: "",
};

export function DriversClient({ initialDrivers }: { initialDrivers: Driver[] }) {
  const [drivers, setDrivers] = useState(initialDrivers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newDriver = await createDriver(formData);
      setDrivers([newDriver, ...drivers]);
      setIsModalOpen(false);
      setFormData(emptyForm);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Haydovchini qo'shishda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Drivers</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Driver
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">DOB</th>
                <th className="px-6 py-4 font-medium">CDL</th>
                <th className="px-6 py-4 font-medium">CDL Expiry</th>
                <th className="px-6 py-4 font-medium">Med Card Expiry</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No drivers found.
                  </td>
                </tr>
              ) : (
                drivers.map((driver) => {
                  const isCdlExpired = new Date(driver.cdlExpiryDate) < new Date();
                  const isMedExpired = new Date(driver.medCardExpiryDate) < new Date();

                  return (
                    <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium">
                        <Link href={`/safety/drivers/${driver.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {driver.firstName} {driver.lastName}
                        </Link>
                      </td>
                      <td className="px-6 py-4">{new Date(driver.dob).toLocaleDateString()}</td>
                      <td className="px-6 py-4">{driver.cdlNumber} ({driver.cdlState})</td>
                      <td className="px-6 py-4">
                        <span className={isCdlExpired ? "text-red-600 font-semibold" : ""}>
                          {new Date(driver.cdlExpiryDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={isMedExpired ? "text-red-600 font-semibold" : ""}>
                          {new Date(driver.medCardExpiryDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          driver.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700"
                        }`}>
                          {driver.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Driver</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <input required type="date" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hire Date</label>
                  <input required type="date" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.hireDate} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">CDL Number</label>
                  <input required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.cdlNumber} onChange={(e) => setFormData({ ...formData, cdlNumber: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">CDL State</label>
                  <input required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.cdlState} onChange={(e) => setFormData({ ...formData, cdlState: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">CDL Issue Date</label>
                  <input required type="date" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.cdlIssueDate} onChange={(e) => setFormData({ ...formData, cdlIssueDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">CDL Expiry</label>
                  <input required type="date" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.cdlExpiryDate} onChange={(e) => setFormData({ ...formData, cdlExpiryDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Medical Card Expiry</label>
                  <input required type="date" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.medCardExpiryDate} onChange={(e) => setFormData({ ...formData, medCardExpiryDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <input className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Cancel</button>
                <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {loading ? "Saving..." : "Save Driver"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
