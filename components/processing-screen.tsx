"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface ProcessingScreenProps {
  documentsCount: number;
  onComplete: () => void;
}

const steps = [
  "Extracting document data...",
  "Parsing pedimento fields...",
  "Reading commercial invoice...",
  "Analyzing bill of lading...",
  "Cross-referencing documents...",
  "Identifying discrepancies...",
  "Generating compliance report...",
];

export function ProcessingScreen({
  documentsCount,
  onComplete,
}: ProcessingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalDuration = 6000;
    const stepInterval = totalDuration / steps.length;
    const progressInterval = totalDuration / 100;

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        return prev + 1;
      });
    }, progressInterval);

    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(stepTimer);
          return prev;
        }
        return prev + 1;
      });
    }, stepInterval);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, totalDuration + 500);

    return () => {
      clearInterval(progressTimer);
      clearInterval(stepTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-10 px-6">
      {/* Animated logo */}
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl opacity-20 blur-xl animate-pulse-slow gradient-accent" />
        <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-card border border-border flex items-center justify-center">
          <Image
            src="/images/mocerto-icon-white.jpg"
            alt="Processing"
            width={48}
            height={48}
            className="animate-pulse"
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 max-w-md">
        <h2 className="text-xl font-semibold text-foreground tracking-tight">
          Analyzing Documents
        </h2>
        <p className="text-sm text-muted-foreground text-center">
          Processing {documentsCount} documents. Our AI engine is extracting and
          cross-referencing all fields.
        </p>
      </div>

      {/* Progress */}
      <div className="w-full max-w-sm flex flex-col gap-4">
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full gradient-accent transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground animate-slide-up" key={currentStep}>
            {steps[currentStep]}
          </p>
          <span className="text-xs text-muted-foreground font-mono">
            {progress}%
          </span>
        </div>
      </div>

      {/* Steps completed */}
      <div className="flex flex-col gap-2 w-full max-w-sm">
        {steps.map((step, i) => (
          <div
            key={step}
            className={`flex items-center gap-2 text-xs transition-all duration-300 ${
              i < currentStep
                ? "text-muted-foreground"
                : i === currentStep
                  ? "text-foreground font-medium"
                  : "text-muted-foreground/30"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i < currentStep
                  ? "bg-success"
                  : i === currentStep
                    ? "bg-accent"
                    : "bg-muted"
              }`}
            />
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}
