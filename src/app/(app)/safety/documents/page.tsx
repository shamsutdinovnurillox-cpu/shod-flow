import { getDocuments } from "@/app/actions/documents";
import { DocumentsClient } from "@/components/fleet/DocumentsClient"; // Reusing the same client component for now

export default async function SafetyDocumentsPage() {
  const documents = await getDocuments();
  
  // In a real app, we might filter documents by entityType === "DRIVER" || entityType === "COMPANY"
  const safetyDocs = documents.filter(doc => doc.entityType === "DRIVER" || doc.entityType === "COMPANY");
  
  return (
    <DocumentsClient initialDocuments={safetyDocs} />
  );
}
