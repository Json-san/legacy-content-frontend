import { apiRequest, apiRequestForm } from "../../lib/api-client";

/** `URL` exists in the backend enum but is not implemented yet (always rejected by the
 * service layer) — the frontend only offers Upload and Manual. */
export type DocumentSourceType = "UPLOAD" | "MANUAL";

export type DocumentStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED" | "ARCHIVED";

export type DocumentVersionStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export type Document = {
  id: string;
  organization_id: string;
  name: string;
  type: string;
  source_type: DocumentSourceType;
  status: DocumentStatus;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentVersion = {
  id: string;
  version: number;
  content_hash: string;
  status: DocumentVersionStatus;
  created_at: string;
};

export type DocumentDetail = Document & {
  versions: DocumentVersion[];
};

export type DocumentCreateInput = {
  name: string;
  type: string;
  source_type: DocumentSourceType;
  content?: string;
  file?: File;
};

export type DocumentVersionInput = {
  content?: string;
  file?: File;
};

export function listDocuments(organizationId: string, token: string): Promise<Document[]> {
  return apiRequest<Document[]>(`/api/v1/organizations/${organizationId}/documents`, { token });
}

export function getDocument(
  organizationId: string,
  token: string,
  documentId: string,
): Promise<DocumentDetail> {
  return apiRequest<DocumentDetail>(
    `/api/v1/organizations/${organizationId}/documents/${documentId}`,
    { token },
  );
}

export function deleteDocument(
  organizationId: string,
  token: string,
  documentId: string,
): Promise<void> {
  return apiRequest<void>(`/api/v1/organizations/${organizationId}/documents/${documentId}`, {
    method: "DELETE",
    token,
  });
}

export function createDocument(
  organizationId: string,
  token: string,
  input: DocumentCreateInput,
): Promise<Document> {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("type", input.type);
  formData.append("source_type", input.source_type);
  if (input.content !== undefined) formData.append("content", input.content);
  if (input.file !== undefined) formData.append("file", input.file);

  return apiRequestForm<Document>(`/api/v1/organizations/${organizationId}/documents`, {
    method: "POST",
    token,
    formData,
  });
}

export function createDocumentVersion(
  organizationId: string,
  token: string,
  documentId: string,
  input: DocumentVersionInput,
): Promise<DocumentVersion> {
  const formData = new FormData();
  if (input.content !== undefined) formData.append("content", input.content);
  if (input.file !== undefined) formData.append("file", input.file);

  return apiRequestForm<DocumentVersion>(
    `/api/v1/organizations/${organizationId}/documents/${documentId}/versions`,
    { method: "POST", token, formData },
  );
}
