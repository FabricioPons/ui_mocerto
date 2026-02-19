"use client";

import { Review } from "@/lib/types";
import {
  Plus,
  FileCheck,
  Clock,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Search,
} from "lucide-react";
import { useState } from "react";

interface DashboardProps {
  reviews: Review[];
  onNewReview: () => void;
  onViewReport: (reviewId: string) => void;
  onContinueReview: (reviewId: string) => void;
}

function StatusBadge({ status }: { status: Review["status"] }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-success/10 text-success">
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-warning/10 text-warning">
        <Clock className="h-3 w-3" />
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-accent/10 text-accent">
      <Clock className="h-3 w-3 animate-spin" />
      Processing
    </span>
  );
}

function ReviewCard({
  review,
  onViewReport,
  onContinue,
}: {
  review: Review;
  onViewReport: () => void;
  onContinue: () => void;
}) {
  const formattedDate = new Date(review.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="group flex flex-col gap-4 p-5 rounded-lg border border-border bg-card hover:border-muted-foreground/20 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground font-mono tracking-wide">
              {review.pedimentoNumber}
            </span>
          </div>
          <p className="text-sm text-foreground">{review.importerName}</p>
          <p className="text-xs text-muted-foreground">
            {review.operationType}
          </p>
        </div>
        <StatusBadge status={review.status} />
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{review.documentsCount} documents</span>
        <span className="w-px h-3 bg-border" />
        <span>{formattedDate}</span>
      </div>

      {review.status === "completed" && (
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-xs text-muted-foreground">
              {review.matchCount} matches
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-xs text-muted-foreground">
              {review.mismatchCount} mismatches
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-xs text-muted-foreground">
              {review.warningCount} warnings
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-1">
        {review.status === "completed" ? (
          <button
            onClick={onViewReport}
            className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-accent transition-colors"
          >
            View Report
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : review.status === "in_progress" ? (
          <button
            onClick={onContinue}
            className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
          >
            Continue Review
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function Dashboard({
  reviews,
  onNewReview,
  onViewReport,
  onContinueReview,
}: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const completedCount = reviews.filter(
    (r) => r.status === "completed"
  ).length;
  const inProgressCount = reviews.filter(
    (r) => r.status === "in_progress"
  ).length;

  const filteredReviews = reviews.filter(
    (r) =>
      r.pedimentoNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.importerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Reviews
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your pedimento compliance reviews.
          </p>
        </div>
        <button
          onClick={onNewReview}
          className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          New Review
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-secondary">
            <FileCheck className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-semibold text-foreground">
              {reviews.length}
            </span>
            <span className="text-xs text-muted-foreground">
              Total Reviews
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-success/10">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-semibold text-foreground">
              {completedCount}
            </span>
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-warning/10">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-semibold text-foreground">
              {inProgressCount}
            </span>
            <span className="text-xs text-muted-foreground">In Progress</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by pedimento number or importer name..."
          className="w-full rounded-md border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
        />
      </div>

      {/* Reviews grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onViewReport={() => onViewReport(review.id)}
            onContinue={() => onContinueReview(review.id)}
          />
        ))}
      </div>

      {filteredReviews.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <FileText className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No reviews found.</p>
        </div>
      )}
    </div>
  );
}
