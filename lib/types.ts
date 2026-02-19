export type ReviewStatus = "completed" | "in_progress" | "processing";

export interface ReviewDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  isPedimento: boolean;
}

export interface ReviewField {
  id: string;
  fieldName: string;
  pedimentoValue: string;
  documentValue: string;
  documentSource: string;
  status: "match" | "mismatch" | "warning";
  severity?: "high" | "medium" | "low";
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
}
