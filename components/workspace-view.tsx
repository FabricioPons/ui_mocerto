"use client";

import { useState, useMemo } from "react";
import {
  Review,
  ReviewField,
  ReviewDocument,
  DocumentClassification,
} from "@/lib/types";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  CheckCheck,
  FileText,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceViewProps {
  review: Review;
}

const CLASSIFICATION_LABELS: Record<DocumentClassification, string> = {
  pedimento: "Pedimento",
  commercial_invoice: "Invoice",
  bill_of_lading: "Bill of Lading",
  packing_list: "Packing List",
  carta_encomienda: "Carta Encomienda",
  carta_3_1_8: "Carta 3.1.8",
  manifestacion_de_valor: "Manif. Valor",
  certificado_produccion: "Cert. Produccion",
  aviso_automatico: "Aviso Automatico",
  delivery_order: "Delivery Order",
  document_compilation: "Doc. Compilation",
  equipment_interchange_receipt: "EIR",
  vucem_acuse: "VUCEM Acuse",
  cargo_insurance: "Cargo Insurance",
  certificate_of_analysis: "COA",
  scanned_docs: "Scanned Docs",
  other: "Other",
};

function getStatusConfig(status: ReviewField["status"]) {
  const configs = {
    match: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", borderColor: "border-success/30", dotColor: "bg-success", label: "Match" },
    mismatch: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", borderColor: "border-destructive/30", dotColor: "bg-destructive", label: "Mismatch" },
    warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", borderColor: "border-warning/30", dotColor: "bg-warning", label: "Warning" },
    missing_in_pedimento: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", borderColor: "border-warning/30", dotColor: "bg-warning", label: "Missing" },
  };
  return configs[status];
}

function docUrl(filePath: string) {
  return `/api/documents/${filePath}`;
}

// ---- Field list sidebar for the left pane ----
function FieldListPanel({
  fields,
  selectedFieldId,
  onSelectField,
  fieldComments,
  fieldResolved,
}: {
  fields: ReviewField[];
  selectedFieldId: string | null;
  onSelectField: (f: ReviewField) => void;
  fieldComments: Record<string, string>;
  fieldResolved: Record<string, boolean>;
}) {
  return (
    <div className="flex flex-col gap-1 p-2">
      {fields.map((field) => {
        const config = getStatusConfig(field.status);
        const Icon = config.icon;
        const isSelected = selectedFieldId === field.id;
        const isResolved = fieldResolved[field.id];
        return (
          <button
            key={field.id}
            onClick={() => onSelectField(field)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-left transition-all text-sm",
              isSelected
                ? "bg-card border border-border shadow-sm"
                : "hover:bg-card/50",
              isResolved && "opacity-60"
            )}
          >
            <Icon className={cn("h-3.5 w-3.5 shrink-0", config.color)} />
            <span className="flex-1 truncate text-foreground">{field.fieldName}</span>
            {isResolved && <CheckCheck className="h-3.5 w-3.5 text-success shrink-0" />}
            {fieldComments[field.id] && !isResolved && <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

// ---- Field detail / resolution panel ----
function FieldDetailPanel({
  field,
  documents,
  comment,
  resolved,
  onCommentChange,
  onResolve,
  onClose,
}: {
  field: ReviewField;
  documents: ReviewDocument[];
  comment: string;
  resolved: boolean;
  onCommentChange: (c: string) => void;
  onResolve: () => void;
  onClose: () => void;
}) {
  const config = getStatusConfig(field.status);
  const Icon = config.icon;
  const crossRefDocs = documents.filter((d) => field.crossRefDocIds.includes(d.id));

  return (
    <div className={cn("border-t flex flex-col gap-3 p-4 bg-card/80", config.borderColor)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", config.color)} />
          <h4 className="text-sm font-semibold text-foreground">{field.fieldName}</h4>
          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", config.bg, config.color)}>
            {config.label}
          </span>
          {resolved && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">
              Resolved
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 p-3 rounded-md bg-secondary/50">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Pedimento Value</span>
          <span className="text-sm text-foreground font-mono">{field.pedimentoValue}</span>
        </div>
        <div className="flex flex-col gap-1 p-3 rounded-md bg-secondary/50">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{field.documentSource}</span>
          <span className="text-sm text-foreground font-mono">{field.documentValue}</span>
        </div>
      </div>

      {field.note && (
        <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
          {field.note}
        </p>
      )}

      {crossRefDocs.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1 self-center">Cross-ref:</span>
          {crossRefDocs.map((d) => (
            <span key={d.id} className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground">
              {d.name}
            </span>
          ))}
        </div>
      )}

      {(field.status === "mismatch" || field.status === "warning" || field.status === "missing_in_pedimento") && (
        <div className="flex items-end gap-2 mt-1">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">
              Reviewer Comment
            </label>
            <textarea
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="Add your comment to resolve this finding..."
              className="w-full text-sm bg-secondary/50 border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              rows={2}
              disabled={resolved}
            />
          </div>
          <button
            onClick={onResolve}
            disabled={resolved}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors shrink-0",
              resolved
                ? "bg-success/10 text-success cursor-default"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <CheckCheck className="h-4 w-4" />
            {resolved ? "Resolved" : "Resolve"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Main Workspace View ----
export function WorkspaceView({ review }: WorkspaceViewProps) {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [rightDocId, setRightDocId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState<DocumentClassification | "all">("all");
  const [fieldComments, setFieldComments] = useState<Record<string, string>>({});
  const [fieldResolved, setFieldResolved] = useState<Record<string, boolean>>({});
  const [showFieldList, setShowFieldList] = useState(true);

  const pedimento = review.documents.find((d) => d.isPedimento);
  const supportingDocs = review.documents.filter((d) => !d.isPedimento);

  const selectedField = review.fields.find((f) => f.id === selectedFieldId) || null;

  // Get unique classifications for filter chips
  const classifications = useMemo(() => {
    const set = new Set(supportingDocs.map((d) => d.classification));
    return Array.from(set);
  }, [supportingDocs]);

  // Filter documents for right pane selector
  const filteredDocs = useMemo(() => {
    let docs = supportingDocs;
    if (classFilter !== "all") {
      docs = docs.filter((d) => d.classification === classFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          CLASSIFICATION_LABELS[d.classification].toLowerCase().includes(q)
      );
    }
    return docs;
  }, [supportingDocs, classFilter, searchQuery]);

  const rightDoc = rightDocId
    ? review.documents.find((d) => d.id === rightDocId)
    : null;

  const handleSelectField = (field: ReviewField) => {
    setSelectedFieldId(field.id);
    // Auto-switch right pane to the primary document for this field
    if (field.documentId) {
      setRightDocId(field.documentId);
    }
  };

  const handleCommentChange = (comment: string) => {
    if (!selectedFieldId) return;
    setFieldComments((prev) => ({ ...prev, [selectedFieldId]: comment }));
  };

  const handleResolve = () => {
    if (!selectedFieldId) return;
    setFieldResolved((prev) => ({ ...prev, [selectedFieldId]: true }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Dual-pane workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANE: Pedimento PDF + field annotations */}
        <div className="flex flex-col w-1/2 border-r border-border">
          {/* Left pane header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground truncate">
                {pedimento?.name || "Pedimento"}
              </span>
            </div>
            <button
              onClick={() => setShowFieldList(!showFieldList)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              {showFieldList ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Fields
            </button>
          </div>

          {/* Left pane content */}
          <div className="flex flex-1 overflow-hidden">
            {/* PDF viewer */}
            <div className="flex-1 relative bg-secondary/20">
              {pedimento ? (
                <iframe
                  src={docUrl(pedimento.filePath)}
                  className="w-full h-full border-0"
                  title="Pedimento PDF"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  No pedimento loaded
                </div>
              )}
            </div>

            {/* Field list sidebar */}
            {showFieldList && (
              <div className="w-64 border-l border-border overflow-y-auto bg-secondary/20 shrink-0">
                <div className="px-3 py-2 border-b border-border">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Field Findings ({review.fields.length})
                  </h3>
                </div>
                <FieldListPanel
                  fields={review.fields}
                  selectedFieldId={selectedFieldId}
                  onSelectField={handleSelectField}
                  fieldComments={fieldComments}
                  fieldResolved={fieldResolved}
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Cross-reference document viewer */}
        <div className="flex flex-col w-1/2">
          {/* Right pane header - document selector */}
          <div className="flex flex-col gap-2 px-4 py-2 border-b border-border bg-card/50 shrink-0">
            {/* Search + doc selector */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="w-full text-sm bg-secondary/50 border border-border rounded-md pl-8 pr-3 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            {/* Classification chips */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setClassFilter("all")}
                className={cn(
                  "text-[10px] px-2 py-1 rounded-md font-medium transition-colors",
                  classFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              {classifications.map((c) => (
                <button
                  key={c}
                  onClick={() => setClassFilter(c)}
                  className={cn(
                    "text-[10px] px-2 py-1 rounded-md font-medium transition-colors",
                    classFilter === c
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {CLASSIFICATION_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          {/* Document list or viewer */}
          {rightDoc ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Active doc header */}
              <div className="flex items-center justify-between px-4 py-1.5 bg-secondary/30 border-b border-border shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-foreground truncate">{rightDoc.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">
                    {CLASSIFICATION_LABELS[rightDoc.classification]}
                  </span>
                </div>
                <button
                  onClick={() => setRightDocId(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* Doc viewer */}
              <div className="flex-1 bg-secondary/20">
                {rightDoc.type === "application/pdf" ? (
                  <iframe
                    src={docUrl(rightDoc.filePath)}
                    className="w-full h-full border-0"
                    title={rightDoc.name}
                  />
                ) : rightDoc.type.startsWith("image/") ? (
                  <div className="flex items-center justify-center h-full p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={docUrl(rightDoc.filePath)}
                      alt={rightDoc.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    Unsupported file format
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-2">
                {filteredDocs.map((doc) => {
                  // Count fields referencing this doc
                  const fieldCount = review.fields.filter(
                    (f) => f.documentId === doc.id || f.crossRefDocIds.includes(doc.id)
                  ).length;
                  // Get worst status
                  const docFields = review.fields.filter(
                    (f) => f.documentId === doc.id || f.crossRefDocIds.includes(doc.id)
                  );
                  const hasMismatch = docFields.some((f) => f.status === "mismatch");
                  const hasWarning = docFields.some((f) => f.status === "warning" || f.status === "missing_in_pedimento");

                  return (
                    <button
                      key={doc.id}
                      onClick={() => setRightDocId(doc.id)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-card/80 transition-colors text-left"
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        hasMismatch ? "bg-destructive" : hasWarning ? "bg-warning" : "bg-success"
                      )} />
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {CLASSIFICATION_LABELS[doc.classification]}
                          {fieldCount > 0 && ` -- ${fieldCount} field${fieldCount > 1 ? "s" : ""} compared`}
                        </p>
                      </div>
                    </button>
                  );
                })}
                {filteredDocs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                    <Search className="h-8 w-8 opacity-40" />
                    <p className="text-sm">No documents match your filter</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom panel - Field detail (when a field is selected) */}
      {selectedField && (
        <FieldDetailPanel
          field={selectedField}
          documents={review.documents}
          comment={fieldComments[selectedField.id] || ""}
          resolved={fieldResolved[selectedField.id] || false}
          onCommentChange={handleCommentChange}
          onResolve={handleResolve}
          onClose={() => setSelectedFieldId(null)}
        />
      )}
    </div>
  );
}
