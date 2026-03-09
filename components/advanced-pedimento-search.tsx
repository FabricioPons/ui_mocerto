"use client";

import { useState, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  Calendar,
  Building2,
  Hash,
  FileText,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { Review } from "@/lib/types";
import {
  customsOffices,
  parsePedimentoNumber,
  getValidationYearOptions,
  type CustomsOffice,
} from "@/lib/pedimento-data";

export interface SearchFilters {
  query: string;
  yearValidation: string;
  customsOffice: string;
  patentNumber: string;
  operationType: string;
  status: string;
}

interface AdvancedPedimentoSearchProps {
  reviews: Review[];
  onFilteredReviewsChange: (filteredReviews: Review[]) => void;
}

function FilterDropdown({
  label,
  icon: Icon,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3 w-3" />
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-md border border-border bg-card px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors cursor-pointer"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

function FilterInput({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3 w-3" />
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition-colors font-mono"
      />
    </div>
  );
}

export function AdvancedPedimentoSearch({
  reviews,
  onFilteredReviewsChange,
}: AdvancedPedimentoSearchProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    yearValidation: "",
    customsOffice: "",
    patentNumber: "",
    operationType: "",
    status: "",
  });

  const yearOptions = useMemo(() => getValidationYearOptions(), []);

  const customsOfficeOptions = useMemo(
    () =>
      customsOffices.map((office: CustomsOffice) => ({
        value: office.code,
        label: `${office.code} - ${office.name}, ${office.state}`,
      })),
    []
  );

  const operationTypeOptions = [
    { value: "IMP", label: t("search.importation") },
    { value: "EXP", label: t("search.exportation") },
  ];

  const statusOptions = [
    { value: "completed", label: t("domain.completed") },
    { value: "in_progress", label: t("domain.inProgress") },
  ];

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.yearValidation) count++;
    if (filters.customsOffice) count++;
    if (filters.patentNumber) count++;
    if (filters.operationType) count++;
    if (filters.status) count++;
    return count;
  }, [filters]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      // Text search (pedimento number or importer name)
      if (filters.query) {
        const queryLower = filters.query.toLowerCase();
        const matchesQuery =
          review.pedimentoNumber.toLowerCase().includes(queryLower) ||
          review.importerName.toLowerCase().includes(queryLower);
        if (!matchesQuery) return false;
      }

      // Parse the pedimento number to extract components
      const parts = parsePedimentoNumber(review.pedimentoNumber);

      // Year of validation filter
      if (filters.yearValidation && parts) {
        if (parts.yearValidation !== filters.yearValidation) return false;
      }

      // Customs office filter
      if (filters.customsOffice && parts) {
        if (parts.customsOffice !== filters.customsOffice) return false;
      }

      // Patent number filter
      if (filters.patentNumber && parts) {
        if (!parts.patentNumber.includes(filters.patentNumber)) return false;
      }

      // Operation type filter
      if (filters.operationType) {
        const opType = review.operationType.toUpperCase();
        if (filters.operationType === "IMP") {
          if (!opType.includes("IMP") && !opType.includes("IMPORT")) return false;
        } else if (filters.operationType === "EXP") {
          if (!opType.includes("EXP") && !opType.includes("EXPORT") && !opType.includes("RETORN")) return false;
        }
      }

      // Status filter
      if (filters.status) {
        if (review.status !== filters.status) return false;
      }

      return true;
    });
  }, [reviews, filters]);

  // Update parent component when filtered reviews change
  useMemo(() => {
    onFilteredReviewsChange(filteredReviews);
  }, [filteredReviews, onFilteredReviewsChange]);

  const clearFilters = () => {
    setFilters({
      query: "",
      yearValidation: "",
      customsOffice: "",
      patentNumber: "",
      operationType: "",
      status: "",
    });
  };

  const updateFilter = (key: keyof SearchFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Main search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => updateFilter("query", e.target.value)}
            placeholder={t("domain.searchPlaceholder")}
            className="w-full rounded-md border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
          />
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-md border text-sm font-medium transition-colors ${
            isExpanded || activeFilterCount > 0
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-foreground hover:bg-secondary"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">{t("search.advancedSearch")}</span>
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Advanced filters panel */}
      {isExpanded && (
        <div className="p-4 rounded-lg border border-border bg-card/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground">
                {t("search.filterByPedimento")}
              </h3>
              <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">
                {t("search.anexo22Structure")}
              </span>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
                {t("search.clearFilters")}
              </button>
            )}
          </div>

          {/* Pedimento structure hint */}
          <div className="mb-4 p-3 rounded-md bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground mb-2">
              {t("search.pedimentoStructure")}
            </p>
            <div className="flex items-center gap-1 font-mono text-sm">
              <span className={`px-1.5 py-0.5 rounded ${filters.yearValidation ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                XX
              </span>
              <span className="text-muted-foreground">-</span>
              <span className={`px-1.5 py-0.5 rounded ${filters.customsOffice ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                XX
              </span>
              <span className="text-muted-foreground">-</span>
              <span className={`px-1.5 py-0.5 rounded ${filters.patentNumber ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                XXXX
              </span>
              <span className="text-muted-foreground">-</span>
              <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                XXXXXXX
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1.5">
              <span className="w-[34px] text-center">{t("search.year")}</span>
              <span className="w-3"></span>
              <span className="w-[34px] text-center">{t("search.customs")}</span>
              <span className="w-3"></span>
              <span className="w-[52px] text-center">{t("search.patent")}</span>
              <span className="w-3"></span>
              <span className="w-[72px] text-center">{t("search.progressive")}</span>
            </div>
          </div>

          {/* Filter grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <FilterDropdown
              label={t("search.yearValidation")}
              icon={Calendar}
              value={filters.yearValidation}
              options={yearOptions}
              onChange={(value) => updateFilter("yearValidation", value)}
              placeholder={t("search.allYears")}
            />

            <FilterDropdown
              label={t("search.customsOffice")}
              icon={Building2}
              value={filters.customsOffice}
              options={customsOfficeOptions}
              onChange={(value) => updateFilter("customsOffice", value)}
              placeholder={t("search.allOffices")}
            />

            <FilterInput
              label={t("search.patentNumber")}
              icon={Hash}
              value={filters.patentNumber}
              onChange={(value) => updateFilter("patentNumber", value.replace(/\D/g, ""))}
              placeholder="0000"
              maxLength={4}
            />

            <FilterDropdown
              label={t("search.operationType")}
              icon={FileText}
              value={filters.operationType}
              options={operationTypeOptions}
              onChange={(value) => updateFilter("operationType", value)}
              placeholder={t("search.allOperations")}
            />

            <FilterDropdown
              label={t("search.status")}
              icon={filters.status === "completed" ? CheckCircle2 : Clock}
              value={filters.status}
              options={statusOptions}
              onChange={(value) => updateFilter("status", value)}
              placeholder={t("search.allStatuses")}
            />
          </div>
        </div>
      )}

      {/* Active filters summary */}
      {activeFilterCount > 0 && !isExpanded && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.yearValidation && (
            <FilterTag
              label={`${t("search.year")}: 20${filters.yearValidation}`}
              onRemove={() => updateFilter("yearValidation", "")}
            />
          )}
          {filters.customsOffice && (
            <FilterTag
              label={`${t("search.customs")}: ${filters.customsOffice}`}
              onRemove={() => updateFilter("customsOffice", "")}
            />
          )}
          {filters.patentNumber && (
            <FilterTag
              label={`${t("search.patent")}: ${filters.patentNumber}`}
              onRemove={() => updateFilter("patentNumber", "")}
            />
          )}
          {filters.operationType && (
            <FilterTag
              label={filters.operationType === "IMP" ? t("search.importation") : t("search.exportation")}
              onRemove={() => updateFilter("operationType", "")}
            />
          )}
          {filters.status && (
            <FilterTag
              label={filters.status === "completed" ? t("domain.completed") : t("domain.inProgress")}
              onRemove={() => updateFilter("status", "")}
            />
          )}
          <button
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
          >
            {t("search.clearAll")}
          </button>
        </div>
      )}

      {/* Results count */}
      <div className="text-xs text-muted-foreground">
        {t("search.showingResults").replace("{count}", filteredReviews.length.toString()).replace("{total}", reviews.length.toString())}
      </div>
    </div>
  );
}

function FilterTag({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
      {label}
      <button
        onClick={onRemove}
        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
