"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

interface HeroAnimationProps {
  onComplete: () => void;
}

const BRAND_NAME = "mocerto";
const LETTER_DELAY = 180;
const PAUSE_AFTER_TYPING = 600;
const TRANSITION_DURATION = 900;

export function HeroAnimation({ onComplete }: HeroAnimationProps) {
  const [typedCount, setTypedCount] = useState(0);
  const [phase, setPhase] = useState<"typing" | "transitioning" | "complete">(
    "typing"
  );
  const [showCursor, setShowCursor] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Blinking cursor
  useEffect(() => {
    if (phase === "complete") {
      setShowCursor(false);
      return;
    }
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, [phase]);

  // Typing animation
  useEffect(() => {
    if (phase !== "typing") return;
    if (typedCount >= BRAND_NAME.length) {
      // All letters typed, pause then transition
      const timer = setTimeout(() => {
        setPhase("transitioning");
      }, PAUSE_AFTER_TYPING);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setTypedCount((prev) => prev + 1);
    }, LETTER_DELAY);
    return () => clearTimeout(timer);
  }, [typedCount, phase]);

  // Transition phase -> complete
  useEffect(() => {
    if (phase !== "transitioning") return;
    const timer = setTimeout(() => {
      setPhase("complete");
    }, TRANSITION_DURATION);
    return () => clearTimeout(timer);
  }, [phase]);

  // After complete, call onComplete
  useEffect(() => {
    if (phase !== "complete") return;
    const timer = setTimeout(() => {
      onComplete();
    }, 400);
    return () => clearTimeout(timer);
  }, [phase, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const isTyping = phase === "typing";
  const isTransitioning = phase === "transitioning";
  const isComplete = phase === "complete";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#060809] overflow-hidden"
      ref={containerRef}
    >
      {/* Subtle ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vh] rounded-full opacity-[0.06] blur-[100px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, #C61030 0%, #C8266E 50%, transparent 80%)",
        }}
      />

      {/* Main animation container */}
      <div
        className={`relative flex items-center justify-center transition-all ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isTransitioning || isComplete
            ? "duration-[900ms] scale-100"
            : "duration-300"
        }`}
      >
        {/* M Icon */}
        <div
          className={`relative flex-shrink-0 transition-all ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isTransitioning || isComplete
              ? "duration-[900ms]"
              : "duration-500"
          }`}
          style={{
            width: isTyping
              ? "clamp(80px, 18vw, 160px)"
              : "clamp(60px, 12vw, 120px)",
            height: "auto",
          }}
        >
          <Image
            src="/images/mocerto-icon-white-transparent.png"
            alt="Mocerto M icon"
            width={160}
            height={160}
            priority
            className={`w-full h-auto object-contain transition-all ease-[cubic-bezier(0.4,0,0.2,1)] ${
              isTransitioning || isComplete
                ? "duration-[900ms]"
                : "duration-500"
            }`}
            style={{
              filter: "brightness(1.1)",
            }}
          />
        </div>

        {/* Text area with typing animation */}
        <div
          className={`relative flex items-baseline overflow-hidden transition-all ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isTransitioning || isComplete
              ? "duration-[900ms] ml-2 sm:ml-3"
              : "duration-300 ml-3 sm:ml-4"
          }`}
        >
          {/* Typed letters */}
          <div className="flex items-baseline">
            {BRAND_NAME.split("").map((letter, index) => (
              <span
                key={index}
                className={`inline-block font-sans font-light tracking-tight transition-all ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isTransitioning || isComplete
                    ? "duration-[800ms]"
                    : "duration-300"
                } ${
                  index < typedCount
                    ? "opacity-100 translate-y-0 scale-100"
                    : "opacity-0 translate-y-2 scale-95"
                }`}
                style={{
                  fontSize: isTyping
                    ? "clamp(2.5rem, 8vw, 5rem)"
                    : "clamp(2rem, 6vw, 3.5rem)",
                  color: "#F1F1F1",
                  transitionDelay:
                    index < typedCount && isTyping
                      ? "0ms"
                      : isTransitioning
                        ? `${index * 30}ms`
                        : "0ms",
                }}
              >
                {letter}
              </span>
            ))}

            {/* Blinking cursor */}
            {isTyping && (
              <span
                className="inline-block transition-opacity duration-100"
                style={{
                  fontSize: "clamp(2.5rem, 8vw, 5rem)",
                  color: "#F1F1F1",
                  opacity: showCursor ? 0.8 : 0,
                  marginLeft: "1px",
                  fontWeight: 100,
                }}
              >
                |
              </span>
            )}
          </div>

          {/* TM Symbol - moves in sync with typing */}
          <sup
            className={`inline-block font-sans font-medium tracking-wide transition-all ease-[cubic-bezier(0.4,0,0.2,1)] ${
              isTransitioning || isComplete
                ? "duration-[800ms]"
                : "duration-500"
            }`}
            style={{
              fontSize: isTyping
                ? "clamp(0.65rem, 1.8vw, 1rem)"
                : "clamp(0.5rem, 1.2vw, 0.75rem)",
              color: "hsl(210, 4%, 50%)",
              opacity:
                typedCount > 0 || isTransitioning || isComplete ? 1 : 0.3,
              marginLeft: "2px",
              transform: `translateY(${isTyping ? "-0.4em" : "-0.5em"})`,
            }}
          >
            TM
          </sup>
        </div>
      </div>

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className={`absolute bottom-8 right-8 text-xs tracking-wide transition-all duration-500 ${
          isComplete
            ? "opacity-0 pointer-events-none"
            : "opacity-100 hover:opacity-80"
        }`}
        style={{ color: "hsl(210, 4%, 30%)" }}
        aria-label="Skip animation"
      >
        Skip
      </button>

      {/* Bottom tagline that fades in after typing */}
      <p
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 text-xs tracking-wide transition-all duration-700 ${
          typedCount >= BRAND_NAME.length
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2"
        }`}
        style={{ color: "hsl(210, 4%, 28%)" }}
      >
        Simplifying international commerce
      </p>

      {/* Fade out overlay */}
      <div
        className={`absolute inset-0 bg-[#060809] pointer-events-none transition-opacity duration-500 ${
          isComplete ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
