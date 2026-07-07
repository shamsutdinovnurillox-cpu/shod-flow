import { getDocuments } from "@/app/actions/documents";
import { DocumentsClient } from "@/components/fleet/DocumentsClient";

export default async function DocumentsPage() {
  const documents = await getDocuments();
  
  return (
    <DocumentsClient initialDocuments={documents} />
  );
}
