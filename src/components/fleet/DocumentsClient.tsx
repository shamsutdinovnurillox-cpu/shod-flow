"use client";

import { Modal } from "@/components/ui/profile";
import { showError } from "@/components/ui/toast";
import { useState, useRef } from "react";
import { createDocument, deleteDocument, replaceDocument } from "@/app/actions/documents";
import { Plus, FileText, Upload, Trash2, RefreshCw } from "lucide-react";
import type { Document } from "@/types/models";
import { useOpenOnNewParam } from "@/components/ui/use-new-param";

export function DocumentsClient({ initialDocuments }: { initialDocuments: Document[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Dashboard tezkor amali (`?new=1`) bilan kelinganda modal o'zi ochiladi.
  useOpenOnNewParam(() => setIsModalOpen(true));
  const [replacing, setReplacing] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const replaceFormRef = useRef<HTMLFormElement>(null);

  // Versiya zanjiri: replacesId'da ko'rsatilganlar eski versiya — gridda faqat oxirgisi.
  const supersededIds = new Set(documents.map((d) => d.replacesId).filter(Boolean) as string[]);
  const latestDocs = documents.filter((d) => !supersededIds.has(d.id));
  const byId = new Map(documents.map((d) => [d.id, d]));
  const versionHistory = (doc: Document): Document[] => {
    const chain: Document[] = [];
    let cur = doc.replacesId ? byId.get(doc.replacesId) : undefined;
    while (cur) {
      chain.push(cur);
      cur = cur.replacesId ? byId.get(cur.replacesId) : undefined;
    }
    return chain;
  };

  const handleReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacing) return;
    setLoading(true);
    try {
      const formData = new FormData(replaceFormRef.current!);
      const newDoc = await replaceDocument(replacing.id, formData);
      setDocuments((prev) => [newDoc, ...prev]);
      setReplacing(null);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Almashtirishda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.fileName ?? doc.type}"? This also removes the stored file.`)) return;
    try {
      await deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (error) {
      showError(error instanceof Error ? error.message : "Amaliyot bajarilmadi.");
    }
  };

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
      showError(error instanceof Error ? error.message : "Amaliyot bajarilmadi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Documents</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4" />
          Upload Document
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {latestDocs.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted bg-surface rounded-xl border border-border">
            No documents found.
          </div>
        ) : (
          latestDocs.map((doc) => (
            <div key={doc.id} className="flex flex-col bg-surface rounded-xl border border-border shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-fg">{doc.type}</h3>
                    <p className="text-xs text-muted">For {doc.entityType}: {doc.entityId}</p>
                    {doc.fileName && <p className="text-xs text-faint truncate max-w-[180px]">{doc.fileName}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setReplacing(doc)} aria-label="Replace document" title="Replace with new version" className="p-1.5 rounded-lg text-muted hover:text-blue-600 hover:bg-blue-50">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(doc)} aria-label="Delete document" className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
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
                  {versionHistory(doc).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted cursor-pointer hover:text-fg">
                        {versionHistory(doc).length} older version{versionHistory(doc).length > 1 ? "s" : ""}
                      </summary>
                      <ul className="mt-1 space-y-1">
                        {versionHistory(doc).map((v) => (
                          <li key={v.id} className="flex justify-between text-xs">
                            <a href={v.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                              {v.fileName ?? v.type}
                            </a>
                            <span className="text-faint shrink-0 ml-2">{new Date(v.createdAt).toLocaleDateString()}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {replacing && (
        <Modal title="Replace Document" description="{replacing.type} — {replacing.fileName ?? replacing.entityId}. Eski versiya tarixda saqlanadi." size="md" onClose={() => setReplacing(null)}>
            <form ref={replaceFormRef} onSubmit={handleReplace} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-fg">New File</label>
                <input name="file" type="file" required className="block w-full text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-soft-fg hover:file:brightness-95" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Issue Date</label>
                  <input type="date" name="issueDate" className="modal-input" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Expiry Date</label>
                  <input type="date" name="expiryDate" className="modal-input" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setReplacing(null)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? "Uploading..." : "Replace"}
                </button>
              </div>
            </form>
        </Modal>
      )}

      {isModalOpen && (
        <Modal title="Upload Document" size="md" onClose={() => setIsModalOpen(false)}>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-fg">Entity Type</label>
                <select name="entityType" className="modal-input">
                  <option value="TRUCK">Truck</option>
                  <option value="TRAILER">Trailer</option>
                  <option value="DRIVER">Driver</option>
                  <option value="COMPANY">Company</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-fg">Entity ID (Unit #, Driver ID)</label>
                <input name="entityId" required className="modal-input" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-fg">Document Type</label>
                <input name="type" placeholder="e.g., Registration, Insurance" required className="modal-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Issue Date</label>
                  <input type="date" name="issueDate" className="modal-input" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg">Expiry Date</label>
                  <input type="date" name="expiryDate" className="modal-input" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-fg">File</label>
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
              
              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
