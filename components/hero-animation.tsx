"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface HeroAnimationProps {
  onComplete: () => void;
}

export function HeroAnimation({ onComplete }: HeroAnimationProps) {
  const [phase, setPhase] = useState<"dark" | "sunrise" | "hold" | "fadeout">(
    "dark"
  );

  // Dark -> sunrise (gradient starts appearing)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase("sunrise");
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Sunrise -> hold (fully revealed, pause for a moment)
  useEffect(() => {
    if (phase !== "sunrise") return;
    const timer = setTimeout(() => {
      setPhase("hold");
    }, 2800);
    return () => clearTimeout(timer);
  }, [phase]);

  // Hold -> fadeout
  useEffect(() => {
    if (phase !== "hold") return;
    const timer = setTimeout(() => {
      setPhase("fadeout");
    }, 800);
    return () => clearTimeout(timer);
  }, [phase]);

  // Fadeout -> complete
  useEffect(() => {
    if (phase !== "fadeout") return;
    const timer = setTimeout(() => {
      onComplete();
    }, 700);
    return () => clearTimeout(timer);
  }, [phase, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const isSunriseOrLater =
    phase === "sunrise" || phase === "hold" || phase === "fadeout";
  const isHoldOrLater = phase === "hold" || phase === "fadeout";

  return (
    <div className="fixed inset-0 z-[100] bg-[#060809] overflow-hidden">
      {/* Main red/magenta glow - rises from bottom-right like a sunrise */}
      <div
        className="absolute pointer-events-none transition-all"
        style={{
          bottom: "-20%",
          right: "-10%",
          width: "80vw",
          height: "80vh",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, #C61030 0%, #C8266E 40%, transparent 70%)",
          filter: "blur(120px)",
          opacity: isSunriseOrLater ? 0.55 : 0,
          transform: isSunriseOrLater
            ? "translateY(-15vh)"
            : "translateY(20vh)",
          transitionDuration: "2800ms",
          transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      />

      {/* Cyan/blue accent glow - appears from top-right */}
      <div
        className="absolute pointer-events-none transition-all"
        style={{
          top: "-15%",
          right: "-5%",
          width: "35vw",
          height: "35vh",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, #6EE1FC 0%, #233BA8 50%, transparent 75%)",
          filter: "blur(80px)",
          opacity: isSunriseOrLater ? 0.7 : 0,
          transform: isSunriseOrLater ? "translateY(0)" : "translateY(-10vh)",
          transitionDuration: "3000ms",
          transitionDelay: "400ms",
          transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      />

      {/* Deep blue mid-layer glow */}
      <div
        className="absolute pointer-events-none transition-all"
        style={{
          top: "5%",
          right: "10%",
          width: "45vw",
          height: "55vh",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, #233BA8 0%, transparent 70%)",
          filter: "blur(100px)",
          opacity: isSunriseOrLater ? 0.4 : 0,
          transitionDuration: "3200ms",
          transitionDelay: "200ms",
          transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      />

      {/* Logo in center - fades in after gradient starts */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-10 transition-all"
        style={{
          opacity: isSunriseOrLater ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${isSunriseOrLater ? 1 : 0.97})`,
          transitionDuration: "1400ms",
          transitionDelay: "600ms",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <Image
          src="/images/mocerto-logo-white-transparent.png"
          alt="Mocerto logo"
          width={320}
          height={86}
          style={{ width: "clamp(200px, 40vw, 360px)", height: "auto" }}
          className="object-contain"
          priority
        />

        {/* Tagline */}
        <p
          className="text-xs tracking-wider transition-all"
          style={{
            color: "hsl(210, 4%, 40%)",
            opacity: isHoldOrLater ? 1 : 0,
            transform: isHoldOrLater ? "translateY(0)" : "translateY(6px)",
            transitionDuration: "800ms",
            transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          Simplifying international commerce
        </p>
      </div>

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute bottom-8 right-8 text-xs tracking-wider transition-opacity duration-500"
        style={{
          color: "hsl(210, 4%, 28%)",
          opacity: phase === "fadeout" ? 0 : 1,
          pointerEvents: phase === "fadeout" ? "none" : "auto",
        }}
        aria-label="Skip animation"
      >
        SKIP
      </button>

      {/* Fade-out overlay */}
      <div
        className="absolute inset-0 bg-[#060809] pointer-events-none transition-opacity"
        style={{
          opacity: phase === "fadeout" ? 1 : 0,
          transitionDuration: "700ms",
        }}
      />
    </div>
  );
}
