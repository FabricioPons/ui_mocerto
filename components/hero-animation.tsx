"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface HeroAnimationProps {
  onComplete: () => void;
}

const BRAND_NAME = "mocerto";
const LETTER_DELAY = 160;
const INITIAL_DELAY = 800;
const PAUSE_AFTER_TYPING = 500;
const SETTLE_DURATION = 1000;
const FINAL_HOLD = 600;

type Phase = "initial" | "typing" | "settling" | "final" | "fadeout";

export function HeroAnimation({ onComplete }: HeroAnimationProps) {
  const [phase, setPhase] = useState<Phase>("initial");
  const [typedCount, setTypedCount] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  // Phase 1: Initial delay then start typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase("typing");
    }, INITIAL_DELAY);
    return () => clearTimeout(timer);
  }, []);

  // Blinking cursor during typing
  useEffect(() => {
    if (phase !== "typing" && phase !== "initial") {
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
      const timer = setTimeout(() => {
        setPhase("settling");
      }, PAUSE_AFTER_TYPING);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setTypedCount((prev) => prev + 1);
    }, LETTER_DELAY);
    return () => clearTimeout(timer);
  }, [typedCount, phase]);

  // Settling -> final
  useEffect(() => {
    if (phase !== "settling") return;
    const timer = setTimeout(() => {
      setPhase("final");
    }, SETTLE_DURATION);
    return () => clearTimeout(timer);
  }, [phase]);

  // Final -> fadeout
  useEffect(() => {
    if (phase !== "final") return;
    const timer = setTimeout(() => {
      setPhase("fadeout");
    }, FINAL_HOLD);
    return () => clearTimeout(timer);
  }, [phase]);

  // Fadeout -> complete
  useEffect(() => {
    if (phase !== "fadeout") return;
    const timer = setTimeout(() => {
      onComplete();
    }, 600);
    return () => clearTimeout(timer);
  }, [phase, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const isInitial = phase === "initial";
  const isTyping = phase === "typing";
  const isSettling = phase === "settling";
  const isFinal = phase === "final";
  const isFadeout = phase === "fadeout";
  const hasSettled = isSettling || isFinal || isFadeout;

  // Progress: how far through the typing we are (0 to 1)
  const typingProgress = typedCount / BRAND_NAME.length;

  return (
    <div className="fixed inset-0 z-[100] bg-[#060809] overflow-hidden">
      {/* Subtle ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none transition-opacity duration-1000"
        style={{
          width: "60vw",
          height: "60vh",
          opacity: hasSettled ? 0.08 : 0.04,
          filter: "blur(100px)",
          background:
            "radial-gradient(ellipse at center, #C61030 0%, #C8266E 50%, transparent 80%)",
        }}
      />

      {/* ================================================================
          M ICON - starts top-left, moves to center-left of logo composition
          ================================================================ */}
      <div
        className="absolute transition-all pointer-events-none"
        style={{
          transitionDuration: hasSettled ? "1000ms" : "600ms",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          // Position: starts at top-left corner, ends centered-left of the logo composition
          ...(isInitial || isTyping
            ? {
                // Top-left corner position, moving slightly toward center as typing progresses
                top: `calc(8vh - ${typingProgress * 2}vh)`,
                left: `calc(8vw + ${typingProgress * 6}vw)`,
                width: "clamp(48px, 8vw, 80px)",
                height: "auto",
                opacity: 1,
              }
            : {
                // Settled: centered, part of the final logo composition
                top: "50%",
                left: "50%",
                transform: "translate(calc(-50% - clamp(80px, 16vw, 200px)), -50%)",
                width: "clamp(48px, 8vw, 80px)",
                height: "auto",
                opacity: isFadeout ? 0 : 1,
              }),
        }}
      >
        <Image
          src="/images/mocerto-icon-white-transparent.png"
          alt="Mocerto M icon"
          width={160}
          height={160}
          priority
          className="w-full h-auto object-contain"
          style={{ filter: "brightness(1.15)" }}
        />
      </div>

      {/* ================================================================
          TM SYMBOL - starts top-right, moves to end of text composition
          ================================================================ */}
      <div
        className="absolute transition-all pointer-events-none"
        style={{
          transitionDuration: hasSettled ? "1000ms" : "600ms",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          ...(isInitial || isTyping
            ? {
                // Top-right corner, drifting slightly toward center as typing progresses
                top: `calc(8vh - ${typingProgress * 2}vh)`,
                right: `calc(8vw + ${typingProgress * 6}vw)`,
                opacity: 1,
              }
            : {
                // Settled: part of the final logo composition, after the text
                top: "50%",
                left: "50%",
                right: "auto",
                transform: "translate(calc(-50% + clamp(80px, 16vw, 200px)), calc(-50% - 0.8em))",
                opacity: isFadeout ? 0 : 1,
              }),
        }}
      >
        <span
          className="font-sans font-medium tracking-wider transition-all"
          style={{
            fontSize: "clamp(0.55rem, 1.2vw, 0.75rem)",
            color: "hsl(210, 4%, 45%)",
            transitionDuration: "600ms",
          }}
        >
          TM
        </span>
      </div>

      {/* ================================================================
          CENTER TYPING TEXT - "mocerto" typed letter by letter
          ================================================================ */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
      >
        <div className="flex items-baseline">
          {BRAND_NAME.split("").map((letter, index) => (
            <span
              key={index}
              className="inline-block font-sans font-light tracking-tight"
              style={{
                fontSize: hasSettled
                  ? "clamp(1.8rem, 5vw, 3.2rem)"
                  : "clamp(2.2rem, 7vw, 4.5rem)",
                color: "#F1F1F1",
                opacity: index < typedCount ? 1 : 0,
                transform:
                  index < typedCount
                    ? "translateY(0) scale(1)"
                    : "translateY(6px) scale(0.92)",
                filter: index < typedCount ? "blur(0)" : "blur(3px)",
                transition: hasSettled
                  ? "all 900ms cubic-bezier(0.4, 0, 0.2, 1)"
                  : "opacity 300ms ease-out, transform 300ms ease-out, filter 300ms ease-out, font-size 900ms cubic-bezier(0.4, 0, 0.2, 1)",
                transitionDelay: hasSettled ? `${index * 25}ms` : "0ms",
              }}
            >
              {letter}
            </span>
          ))}

          {/* Blinking cursor */}
          {(isInitial || isTyping) && (
            <span
              className="inline-block font-light"
              style={{
                fontSize: "clamp(2.2rem, 7vw, 4.5rem)",
                color: "#F1F1F1",
                opacity: showCursor ? 0.7 : 0,
                transition: "opacity 80ms",
                marginLeft: "1px",
                fontWeight: 200,
              }}
            >
              |
            </span>
          )}
        </div>
      </div>

      {/* ================================================================
          FINAL FULL LOGO - fades in on top of the composed elements
          ================================================================ */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity"
        style={{
          transitionDuration: "800ms",
          opacity: isFinal || isFadeout ? 1 : 0,
          width: "clamp(240px, 42vw, 480px)",
          height: "auto",
        }}
      >
        <Image
          src="/images/mocerto-logo-white-transparent.png"
          alt="Mocerto full logo"
          width={800}
          height={200}
          priority
          className="w-full h-auto object-contain"
          style={{ filter: "brightness(1.15)" }}
        />
      </div>

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute bottom-8 right-8 text-xs tracking-wider transition-all duration-500"
        style={{
          color: "hsl(210, 4%, 28%)",
          opacity: isFadeout || isFinal ? 0 : 1,
          pointerEvents: isFadeout || isFinal ? "none" : "auto",
        }}
        aria-label="Skip animation"
      >
        SKIP
      </button>

      {/* Bottom tagline */}
      <p
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs tracking-wider transition-all duration-700"
        style={{
          color: "hsl(210, 4%, 28%)",
          opacity: typedCount >= BRAND_NAME.length && !isFadeout ? 1 : 0,
          transform:
            typedCount >= BRAND_NAME.length
              ? "translateX(-50%) translateY(0)"
              : "translateX(-50%) translateY(4px)",
        }}
      >
        Simplifying international commerce
      </p>

      {/* Fade-out overlay */}
      <div
        className="absolute inset-0 bg-[#060809] pointer-events-none transition-opacity duration-500"
        style={{ opacity: isFadeout ? 1 : 0 }}
      />
    </div>
  );
}
