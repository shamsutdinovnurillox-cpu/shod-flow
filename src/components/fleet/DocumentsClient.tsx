"use client";

import { useState, useRef } from "react";
import { createDocument } from "@/app/actions/documents";
import { Plus, FileText, Upload } from "lucide-react";
import type { Document } from "@/types/models";

export function DocumentsClient({ initialDocuments }: { initialDocuments: Document[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(formRef.current!);
      const newDoc = await createDocument(formData);
      setDocuments([newDoc, ...documents]);
      setIsModalOpen(false);
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
        <h1 className="text-2xl font-semibold text-fg">Documents</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          Upload Document
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted bg-surface rounded-xl border border-border">
            No documents found.
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="flex flex-col bg-surface rounded-xl border border-border shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-fg">{doc.type}</h3>
                    <p className="text-xs text-muted">For {doc.entityType}: {doc.entityId}</p>
                  </div>
                </div>
              </div>
              <div className="mt-auto space-y-2 text-sm text-muted">
                <div className="flex justify-between">
                  <span>Issued:</span>
                  <span className="font-medium text-fg">{doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expires:</span>
                  <span className="font-medium text-red-600">{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="pt-3 mt-3 border-t border-border">
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                    View File &rarr;
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-fg mb-4">Upload Document</h2>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg">Entity Type</label>
                <select name="entityType" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                  <option value="TRUCK">Truck</option>
                  <option value="TRAILER">Trailer</option>
                  <option value="DRIVER">Driver</option>
                  <option value="COMPANY">Company</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-fg">Entity ID (Unit #, Driver ID)</label>
                <input name="entityId" required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg">Document Type</label>
                <input name="type" placeholder="e.g., Registration, Insurance" required className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg">Issue Date</label>
                  <input type="date" name="issueDate" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg">Expiry Date</label>
                  <input type="date" name="expiryDate" className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-fg">File</label>
                <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-border px-6 pt-5 pb-6">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-faint" />
                    <div className="flex text-sm text-muted">
                      <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-surface font-medium text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 hover:text-blue-500">
                        <span>Upload a file</span>
                        <input id="file-upload" name="file" type="file" className="sr-only" required />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-muted">PDF, PNG, JPG up to 10MB</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2">Cancel</button>
                <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {loading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
