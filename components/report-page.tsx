"use client";

import { Review, ReviewField } from "@/lib/types";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface ReportPageProps {
  review: Review;
  onBack: () => void;
  hideNav?: boolean;
}

type FilterType = "all" | "match" | "mismatch" | "warning";

function FieldRow({
  field,
  isExpanded,
  onToggle,
}: {
  field: ReviewField;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  
  const statusConfig = {
    match: {
      icon: CheckCircle2,
      color: "text-success",
      bg: "bg-success/10",
      label: t("domain.match"),
    },
    mismatch: {
      icon: XCircle,
      color: "text-destructive",
      bg: "bg-destructive/10",
      label: t("domain.mismatch"),
    },
    warning: {
      icon: AlertTriangle,
      color: "text-warning",
      bg: "bg-warning/10",
      label: t("domain.warning"),
    },
    missing_in_pedimento: {
      icon: AlertTriangle,
      color: "text-warning",
      bg: "bg-warning/10",
      label: t("domain.missing"),
    },
  };

  const config = statusConfig[field.status];
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        "flex flex-col border rounded-lg transition-all",
        field.status === "mismatch"
          ? "border-destructive/20"
          : field.status === "warning"
            ? "border-warning/20"
            : "border-border"
      )}
    >
      <button
        onClick={onToggle}
        className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-card/50 transition-colors rounded-lg"
      >
        <StatusIcon className={cn("h-4 w-4 shrink-0", config.color)} />
        <span className="text-sm font-medium text-foreground flex-1 min-w-0">
          {field.fieldName}
        </span>
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            config.bg,
            config.color
          )}
        >
          {config.label}
        </span>
        {(field.status !== "match" || field.note) &&
          (isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ))}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-7">
            <div className="flex flex-col gap-1 p-3 rounded-md bg-secondary/50">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {t("domain.pedimentoValue")}
              </span>
              <span className="text-sm text-foreground font-mono">
                {field.pedimentoValue}
              </span>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-md bg-secondary/50">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {field.documentSource}
              </span>
              <span className="text-sm text-foreground font-mono">
                {field.documentValue}
              </span>
            </div>
          </div>
          {field.note && (
            <div className="flex items-start gap-2 pl-7">
              <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {field.note}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ReportPage({ review, onBack, hideNav }: ReportPageProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Auto-expand mismatches and warnings
    return new Set(
      review.fields
        .filter((f) => f.status === "mismatch" || f.status === "warning")
        .map((f) => f.id)
    );
  });

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredFields =
    filter === "all"
      ? review.fields
      : filter === "warning"
        ? review.fields.filter((f) => f.status === "warning" || f.status === "missing_in_pedimento")
        : review.fields.filter((f) => f.status === filter);

  const matchCount = review.fields.filter((f) => f.status === "match").length;
  const mismatchCount = review.fields.filter(
    (f) => f.status === "mismatch"
  ).length;
  const warningCount = review.fields.filter(
    (f) => f.status === "warning" || f.status === "missing_in_pedimento"
  ).length;
  const totalFields = review.fields.length;

  const complianceScore =
    totalFields > 0
      ? Math.round(((totalFields - mismatchCount) / totalFields) * 100)
      : 100;

  const scoreColor =
    complianceScore >= 90
      ? "text-success"
      : complianceScore >= 70
        ? "text-warning"
        : "text-destructive";

  const ScoreIcon =
    complianceScore >= 90
      ? ShieldCheck
      : complianceScore >= 70
        ? Shield
        : ShieldAlert;

  const formattedDate = new Date(review.createdAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto px-6 py-8">
      {/* Navigation */}
      {!hideNav && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("domain.backToDashboard")}
        </button>
      )}

      {/* Report Header */}
      <div className="flex flex-col gap-6 p-6 rounded-lg border border-border bg-card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                {t("domain.complianceReport")}
              </h1>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-foreground font-mono tracking-wide">
                Pedimento: {review.pedimentoNumber}
              </p>
              <p className="text-sm text-muted-foreground">
                {review.importerName}
              </p>
              <p className="text-xs text-muted-foreground">
                {review.operationType} | {formattedDate}
              </p>
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center gap-3 px-5 py-4 rounded-lg bg-secondary">
            <ScoreIcon className={cn("h-8 w-8", scoreColor)} />
            <div className="flex flex-col">
              <span className={cn("text-2xl font-bold", scoreColor)}>
                {complianceScore}%
              </span>
              <span className="text-xs text-muted-foreground">
                {t("domain.complianceScore")}
              </span>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-md bg-success/5 border border-success/10">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-foreground">
                {matchCount}
              </span>
              <span className="text-xs text-muted-foreground">{t("domain.matches")}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-md bg-destructive/5 border border-destructive/10">
            <XCircle className="h-4 w-4 text-destructive" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-foreground">
                {mismatchCount}
              </span>
              <span className="text-xs text-muted-foreground">{t("domain.mismatches")}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-md bg-warning/5 border border-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-foreground">
                {warningCount}
              </span>
              <span className="text-xs text-muted-foreground">{t("domain.warnings")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-1 bg-secondary rounded-md p-1">
            {(
              [
                { key: "all", label: t("domain.all"), count: totalFields },
                { key: "match", label: t("domain.matches"), count: matchCount },
                { key: "mismatch", label: t("domain.mismatches"), count: mismatchCount },
                { key: "warning", label: t("domain.warnings"), count: warningCount },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                  filter === f.key
                    ? "bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "text-[10px] font-mono",
                    filter === f.key
                      ? "text-muted-foreground"
                      : "text-muted-foreground/50"
                  )}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md border border-border hover:bg-card">
          <Download className="h-3.5 w-3.5" />
          {t("domain.export")}
        </button>
      </div>

      {/* Field Results */}
      <div className="flex flex-col gap-2">
        {filteredFields.map((field) => (
          <FieldRow
            key={field.id}
            field={field}
            isExpanded={expandedIds.has(field.id)}
            onToggle={() => toggleExpanded(field.id)}
          />
        ))}
      </div>

      {filteredFields.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {t("domain.noFieldsMatch")}
          </p>
        </div>
      )}
    </div>
  );
}
