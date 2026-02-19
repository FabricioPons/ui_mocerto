"use client";

import { useState, useCallback } from "react";
import { LoginPage } from "@/components/login-page";
import { AppHeader } from "@/components/app-header";
import { Dashboard } from "@/components/dashboard";
import { NewReview } from "@/components/new-review";
import { ProcessingScreen } from "@/components/processing-screen";
import { ReportPage } from "@/components/report-page";
import { Review } from "@/lib/types";
import { mockReviews } from "@/lib/mock-data";

type AppView = "login" | "dashboard" | "new-review" | "processing" | "report";

export default function Page() {
  const [view, setView] = useState<AppView>("login");
  const [reviews] = useState<Review[]>(mockReviews);
  const [currentReviewId, setCurrentReviewId] = useState<string | null>(null);
  const [uploadedFilesCount, setUploadedFilesCount] = useState(0);

  const handleLogin = useCallback(() => {
    setView("dashboard");
  }, []);

  const handleLogout = useCallback(() => {
    setView("login");
    setCurrentReviewId(null);
  }, []);

  const handleNewReview = useCallback(() => {
    setView("new-review");
  }, []);

  const handleViewReport = useCallback((reviewId: string) => {
    setCurrentReviewId(reviewId);
    setView("report");
  }, []);

  const handleContinueReview = useCallback((reviewId: string) => {
    setCurrentReviewId(reviewId);
    setView("new-review");
  }, []);

  const handleSubmitDocuments = useCallback(
    (files: { id: string; file: File; isPedimento: boolean }[]) => {
      setUploadedFilesCount(files.length);
      setView("processing");
    },
    []
  );

  const handleProcessingComplete = useCallback(() => {
    // Show report for the first completed review (demo)
    setCurrentReviewId("rev-001");
    setView("report");
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setView("dashboard");
    setCurrentReviewId(null);
  }, []);

  const currentReview = reviews.find((r) => r.id === currentReviewId);

  if (view === "login") {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader
        onLogout={handleLogout}
        onNavigateDashboard={handleBackToDashboard}
      />
      <main className="flex-1">
        {view === "dashboard" && (
          <Dashboard
            reviews={reviews}
            onNewReview={handleNewReview}
            onViewReport={handleViewReport}
            onContinueReview={handleContinueReview}
          />
        )}
        {view === "new-review" && (
          <NewReview
            onBack={handleBackToDashboard}
            onSubmit={handleSubmitDocuments}
          />
        )}
        {view === "processing" && (
          <ProcessingScreen
            documentsCount={uploadedFilesCount}
            onComplete={handleProcessingComplete}
          />
        )}
        {view === "report" && currentReview && (
          <ReportPage review={currentReview} onBack={handleBackToDashboard} />
        )}
      </main>
    </div>
  );
}
