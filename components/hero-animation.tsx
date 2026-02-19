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

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("sunrise"), 200);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (phase !== "sunrise") return;
    const t = setTimeout(() => setPhase("hold"), 1500);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "hold") return;
    const t = setTimeout(() => setPhase("fadeout"), 600);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "fadeout") return;
    const t = setTimeout(() => onComplete(), 700);
    return () => clearTimeout(t);
  }, [phase, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const gradientVisible =
    phase === "sunrise" || phase === "hold" || phase === "fadeout";

  return (
    <div className="fixed inset-0 z-[100] bg-[#060809] overflow-hidden">
      {/* Red/magenta glow - bottom right */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "-20%",
          right: "-10%",
          width: "80vw",
          height: "80vh",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, #C61030 0%, #C8266E 40%, transparent 70%)",
          filter: "blur(120px)",
          opacity: gradientVisible ? 0.55 : 0,
          transform: gradientVisible ? "translateY(-15vh)" : "translateY(20vh)",
          transition: "opacity 1.5s cubic-bezier(0.25,0.46,0.45,0.94), transform 1.5s cubic-bezier(0.25,0.46,0.45,0.94)",
        }}
      />

      {/* Cyan/blue glow - top right */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-15%",
          right: "-5%",
          width: "35vw",
          height: "35vh",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, #6EE1FC 0%, #233BA8 50%, transparent 75%)",
          filter: "blur(80px)",
          opacity: gradientVisible ? 0.7 : 0,
          transform: gradientVisible ? "translateY(0)" : "translateY(-10vh)",
          transition: "opacity 1.5s cubic-bezier(0.25,0.46,0.45,0.94) 0.1s, transform 1.5s cubic-bezier(0.25,0.46,0.45,0.94) 0.1s",
        }}
      />

      {/* Deep blue mid-layer */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "5%",
          right: "10%",
          width: "45vw",
          height: "55vh",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, #233BA8 0%, transparent 70%)",
          filter: "blur(100px)",
          opacity: gradientVisible ? 0.4 : 0,
          transition: "opacity 1.5s cubic-bezier(0.25,0.46,0.45,0.94) 0.05s",
        }}
      />

      {/* Logo + tagline -- always visible, no animation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-10">
        <Image
          src="/images/mocerto-logo-white-transparent.png"
          alt="Mocerto logo"
          width={320}
          height={86}
          style={{ width: "clamp(200px, 40vw, 360px)", height: "auto" }}
          className="object-contain"
          priority
        />
        <p
          className="text-xs tracking-wider"
          style={{ color: "hsl(210, 4%, 40%)" }}
        >
          Simplifying international commerce
        </p>
      </div>

      {/* Skip */}
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
