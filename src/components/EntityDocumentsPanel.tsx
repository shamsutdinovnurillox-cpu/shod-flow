"use client";

import { showError } from "@/components/ui/toast";
import { useState, useRef } from "react";
import { createDocument, deleteDocument } from "@/app/actions/documents";
import { FileText, Trash2, Upload } from "lucide-react";
import type { Document } from "@/types/models";

/**
 * Bitta yozuvga (accident/claim/inspection/insurance/...) biriktirilgan fayllar:
 * ro'yxat + yuklash + o'chirish. Detail sahifalarda qayta ishlatiladi.
 */
export function EntityDocumentsPanel({
  entityType,
  entityId,
  initialDocuments,
  defaultDocType,
}: {
  entityType: string;
  entityId: string;
  initialDocuments: Document[];
  defaultDocType: string;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(formRef.current!);
      formData.set("entityType", entityType);
      formData.set("entityId", entityId);
      const newDoc = await createDocument(formData);
      setDocuments((prev) => [newDoc, ...prev]);
      formRef.current!.reset();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Yuklashda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.fileName ?? doc.type}"?`)) return;
    try {
      await deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (error) {
      showError(error instanceof Error ? error.message : "Amaliyot bajarilmadi.");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm p-6">
      <h2 className="text-lg font-bold text-fg mb-3">Files ({documents.length})</h2>

      {documents.length === 0 ? (
        <p className="text-sm text-muted py-2">No files attached.</p>
      ) : (
        <ul className="divide-y divide-border mb-4">
          {documents.map((doc) => (
            <li key={doc.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                  {doc.fileName ?? doc.type}
                </a>
                <span className="text-xs text-faint shrink-0">{doc.type}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted">{new Date(doc.createdAt).toLocaleDateString()}</span>
                <button onClick={() => handleDelete(doc)} aria-label="Delete file" className="p-1 rounded text-muted hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} onSubmit={handleUpload} className="flex flex-wrap items-end gap-3 pt-3 border-t border-border">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Document Type</label>
          <input name="type" defaultValue={defaultDocType} required className="modal-input !mt-0 w-44" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">File (PDF/PNG/JPG, max 10MB)</label>
          <input name="file" type="file" required className="block text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100" />
        </div>
        <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          <Upload className="h-4 w-4" />
          {loading ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
}
