"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileText,
  X,
  Star,
  ArrowLeft,
  ArrowRight,
  FolderOpen,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedFile {
  id: string;
  file: File;
  isPedimento: boolean;
}

interface NewReviewProps {
  onBack: () => void;
  onSubmit: (files: UploadedFile[]) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NewReview({ onBack, onSubmit }: NewReviewProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const uploadedFiles: UploadedFile[] = fileArray.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        isPedimento: false,
      }));

      setFiles((prev) => {
        const updated = [...prev, ...uploadedFiles];
        // If only one file and no pedimento set yet, mark it
        if (updated.length === 1 && !updated.some((f) => f.isPedimento)) {
          updated[0].isPedimento = true;
        }
        return updated;
      });
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const items = e.dataTransfer.items;
      if (items) {
        const filePromises: Promise<File[]>[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            filePromises.push(readEntry(entry));
          } else if (item.kind === "file") {
            const file = item.getAsFile();
            if (file) filePromises.push(Promise.resolve([file]));
          }
        }
        Promise.all(filePromises).then((results) => {
          const allFiles = results.flat();
          if (allFiles.length > 0) addFiles(allFiles);
        });
      } else if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const togglePedimento = (id: string) => {
    setFiles((prev) =>
      prev.map((f) => ({
        ...f,
        isPedimento: f.id === id ? !f.isPedimento : false,
      }))
    );
  };

  const hasPedimento = files.some((f) => f.isPedimento);
  const hasFiles = files.length > 0;
  const canSubmit = hasPedimento && files.length >= 2;

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            New Review
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload the pedimento and all supporting documents for analysis.
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
        <AlertCircle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
        <div className="flex flex-col gap-1">
          <p className="text-sm text-foreground font-medium">How it works</p>
          <ol className="text-xs text-muted-foreground flex flex-col gap-1">
            <li>
              1. Drop a folder or select files containing the pedimento and
              supporting documents.
            </li>
            <li>
              2. Mark one document as the main pedimento (click the star icon).
            </li>
            <li>
              3. Click "Start Analysis" to begin the compliance review.
            </li>
          </ol>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-4 p-12 rounded-lg border-2 border-dashed cursor-pointer transition-all",
          isDragOver
            ? "border-accent bg-accent/5"
            : "border-border hover:border-muted-foreground/30 hover:bg-card/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.docx,.doc,.jpg,.jpeg,.png,.json"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
          aria-label="Upload documents"
        />
        <div
          className={cn(
            "flex items-center justify-center w-14 h-14 rounded-xl transition-colors",
            isDragOver ? "bg-accent/10" : "bg-secondary"
          )}
        >
          {isDragOver ? (
            <FolderOpen className="h-6 w-6 text-accent" />
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-foreground">
            {isDragOver
              ? "Drop files or folder here"
              : "Drag & drop files or a folder here"}
          </p>
          <p className="text-xs text-muted-foreground">
            or click to browse. Supports PDF, XLSX, DOCX, JPG, PNG
          </p>
        </div>
      </div>

      {/* File List */}
      {hasFiles && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">
              Uploaded Documents ({files.length})
            </h2>
            {!hasPedimento && (
              <span className="text-xs text-accent">
                Mark one file as the main pedimento
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {files.map((f) => (
              <div
                key={f.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg border transition-all",
                  f.isPedimento
                    ? "border-accent/30 bg-accent/5"
                    : "border-border bg-card"
                )}
              >
                <FileText
                  className={cn(
                    "h-4 w-4 shrink-0",
                    f.isPedimento ? "text-accent" : "text-muted-foreground"
                  )}
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm text-foreground truncate">
                    {f.file.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(f.file.size)}
                    {f.isPedimento && (
                      <span className="ml-2 text-accent font-medium">
                        Main Pedimento
                      </span>
                    )}
                  </span>
                </div>
                <button
                  onClick={() => togglePedimento(f.id)}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    f.isPedimento
                      ? "text-accent hover:bg-accent/10"
                      : "text-muted-foreground/40 hover:text-accent hover:bg-accent/5"
                  )}
                  title="Mark as main pedimento"
                  aria-label={
                    f.isPedimento
                      ? "Unmark as pedimento"
                      : "Mark as main pedimento"
                  }
                >
                  <Star
                    className="h-4 w-4"
                    fill={f.isPedimento ? "currentColor" : "none"}
                  />
                </button>
                <button
                  onClick={() => removeFile(f.id)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                  aria-label={`Remove ${f.file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      {hasFiles && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {canSubmit
              ? "Ready to analyze. Click to start the compliance review."
              : !hasPedimento
                ? "Please mark one document as the main pedimento."
                : "Upload at least 2 documents (1 pedimento + supporting docs)."}
          </p>
          <button
            onClick={() => canSubmit && onSubmit(files)}
            disabled={!canSubmit}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start Analysis
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// Recursively read directory entries
function readEntry(entry: FileSystemEntry): Promise<File[]> {
  return new Promise((resolve) => {
    if (entry.isFile) {
      (entry as FileSystemFileEntry).file((file) => {
        // Skip hidden files
        if (file.name.startsWith(".")) {
          resolve([]);
        } else {
          resolve([file]);
        }
      });
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      reader.readEntries((entries) => {
        Promise.all(entries.map(readEntry)).then((results) => {
          resolve(results.flat());
        });
      });
    } else {
      resolve([]);
    }
  });
}
