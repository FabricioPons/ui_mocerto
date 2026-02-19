"use client";

import { useState } from "react";
import { Review } from "@/lib/types";
import { ReportPage } from "./report-page";
import { WorkspaceView } from "./workspace-view";
import { DiagramView } from "./diagram-view";
import { ArrowLeft, FileText, LayoutPanelLeft, Network } from "lucide-react";
import { cn } from "@/lib/utils";

type AnalysisTab = "report" | "workspace" | "diagram";

interface AnalysisViewProps {
  review: Review;
  onBack: () => void;
}

const tabs: { key: AnalysisTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "report", label: "Report", icon: FileText },
  { key: "workspace", label: "Workspace", icon: LayoutPanelLeft },
  { key: "diagram", label: "Diagram", icon: Network },
];

export function AnalysisView({ review, onBack }: AnalysisViewProps) {
  const [activeTab, setActiveTab] = useState<AnalysisTab>("report");

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Tab navigation bar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-border bg-card/50 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </button>

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{review.pedimentoNumber}</span>
          <span className="text-border">|</span>
          <span>{review.importerName}</span>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "report" && (
          <div className="h-full overflow-y-auto">
            <ReportPage review={review} onBack={onBack} hideNav />
          </div>
        )}
        {activeTab === "workspace" && (
          <WorkspaceView review={review} />
        )}
        {activeTab === "diagram" && (
          <DiagramView review={review} />
        )}
      </div>
    </div>
  );
}
