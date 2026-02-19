export type ReviewStatus = "completed" | "in_progress" | "processing";

export type DocumentClassification =
  | "pedimento"
  | "commercial_invoice"
  | "bill_of_lading"
  | "packing_list"
  | "carta_encomienda"
  | "carta_3_1_8"
  | "manifestacion_de_valor"
  | "certificado_produccion"
  | "aviso_automatico"
  | "delivery_order"
  | "document_compilation"
  | "equipment_interchange_receipt"
  | "vucem_acuse"
  | "cargo_insurance"
  | "certificate_of_analysis"
  | "scanned_docs"
  | "other";

export interface ReviewDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  isPedimento: boolean;
  classification: DocumentClassification;
  filePath: string;
  operationId?: string;
}

export interface ReviewField {
  id: string;
  fieldName: string;
  pedimentoValue: string;
  documentValue: string;
  documentSource: string;
  documentId: string;
  crossRefDocIds: string[];
  status: "match" | "mismatch" | "warning" | "missing_in_pedimento";
  severity?: "high" | "medium" | "low";
  note?: string;
  userComment?: string;
  resolved?: boolean;
}

export interface FieldRelation {
  id: string;
  sourceDocId: string;
  targetDocId: string;
  fieldName: string;
  sourceValue: string;
  targetValue: string;
  status: "match" | "mismatch" | "warning";
  note?: string;
}

export interface Review {
  id: string;
  pedimentoNumber: string;
  importerName: string;
  operationType: string;
  status: ReviewStatus;
  createdAt: string;
  completedAt?: string;
  documentsCount: number;
  matchCount: number;
  mismatchCount: number;
  warningCount: number;
  documents: ReviewDocument[];
  fields: ReviewField[];
  fieldRelations?: FieldRelation[];
}
