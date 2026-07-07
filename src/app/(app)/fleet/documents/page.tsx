import { getDocuments } from "@/app/actions/documents";
import { requireModule } from "@/lib/auth-guard";
import { DocumentsClient } from "@/components/fleet/DocumentsClient";

export default async function DocumentsPage() {
  await requireModule("fleet.documents");
  const documents = await getDocuments();
  
  return (
    <DocumentsClient initialDocuments={documents} />
  );
}
