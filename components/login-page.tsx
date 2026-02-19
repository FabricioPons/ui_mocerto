"use client";

import { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import Image from "next/image";

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCredentials, setShowCredentials] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showCredentials) {
      const timer = setTimeout(() => {
        emailInputRef.current?.focus();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [showCredentials]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsLoading(false);
    onLogin();
  };

  return (
    <div className="flex min-h-screen bg-[#060809] overflow-hidden">
      {/* Left section - Branding (hidden on mobile when credentials are shown) */}
      <div
        className={`relative flex flex-col items-center justify-center overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          showCredentials
            ? "hidden lg:flex w-full lg:w-1/2"
            : "w-full"
        }`}
      >
        {/* Main red/magenta glow - large, emanating from right edge */}
        <div
          className="absolute top-[10%] right-[-10%] w-[70vw] h-[80vh] rounded-full opacity-[0.55] blur-[120px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, #C61030 0%, #C8266E 40%, transparent 70%)",
          }}
        />

        {/* Cyan/blue accent glow - top right corner */}
        <div
          className="absolute top-[-15%] right-[-5%] w-[35vw] h-[35vh] rounded-full opacity-[0.7] blur-[80px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, #6EE1FC 0%, #233BA8 50%, transparent 75%)",
          }}
        />

        {/* Deep blue mid-layer for the transition between cyan and red */}
        <div
          className="absolute top-[5%] right-[10%] w-[45vw] h-[55vh] rounded-full opacity-[0.4] blur-[100px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, #233BA8 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-10 px-8">
          {/* Logo */}
          <Image
            src="/images/mocerto-logo-white-transparent.png"
            alt="Mocerto logo"
            width={320}
            height={86}
            style={{ width: "320px", height: "auto" }}
            className="object-contain"
            priority
          />

          {/* Product title + description */}
          <div className="flex flex-col items-center gap-4 max-w-lg">
            <h2 className="text-2xl font-semibold text-[#F1F1F1] tracking-tight text-center text-balance">
              Glosador Inteligente
            </h2>
            <p
              className="text-sm text-center leading-relaxed max-w-sm"
              style={{ color: "hsl(210, 4%, 50%)" }}
            >
              Your AI-powered copilot for customs compliance. Detect errors,
              inconsistencies, and risks before submission.
            </p>
          </div>

          {/* Sign in button - only visible when credentials panel is hidden */}
          <div
            className={`transition-all duration-500 ease-out ${
              showCredentials
                ? "opacity-0 translate-y-2 pointer-events-none h-0 mt-0"
                : "opacity-100 translate-y-0 mt-2"
            }`}
          >
            <button
              onClick={() => setShowCredentials(true)}
              className="group flex items-center gap-2.5 px-8 py-3 rounded-md bg-[#F1F1F1] text-[#060809] text-sm font-medium hover:bg-[#F1F1F1]/90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#F1F1F1]/30 focus:ring-offset-2 focus:ring-offset-[#060809]"
            >
              Sign in
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* Bottom tagline */}
        <p
          className="absolute bottom-8 text-xs tracking-wide"
          style={{ color: "hsl(210, 4%, 35%)" }}
        >
          Simplifying international commerce
        </p>
      </div>

      {/* Right section - Credentials panel (slides in) */}
      <div
        className={`fixed right-0 top-0 h-full flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          showCredentials
            ? "w-full lg:w-1/2 translate-x-0 opacity-100 z-50"
            : "w-full lg:w-1/2 translate-x-full opacity-0 pointer-events-none"
        }`}
        style={{ backgroundColor: "#060809" }}
      >
        {/* The dark credentials box */}
        <div
          className={`w-full max-w-md mx-6 sm:mx-auto rounded-xl border border-[hsl(210,5%,12%)] bg-[hsl(210,8%,5.5%)] p-8 sm:p-10 shadow-2xl shadow-black/40 transition-all duration-700 delay-100 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            showCredentials
              ? "translate-y-0 opacity-100 scale-100"
              : "translate-y-6 opacity-0 scale-[0.97]"
          }`}
        >
          {/* Mocerto icon at top of credentials box */}
          <div className="flex items-center gap-3 mb-8">
            <Image
              src="/images/mocerto-icon-white-transparent.png"
              alt="Mocerto"
              width={28}
              height={28}
              style={{ width: "28px", height: "auto" }}
              className="object-contain"
            />
            <div className="h-5 w-px bg-[hsl(210,5%,18%)]" />
            <span
              className="text-xs font-medium uppercase tracking-widest"
              style={{ color: "hsl(210, 4%, 45%)" }}
            >
              Secure login
            </span>
          </div>

          <div className="flex flex-col gap-2 mb-7">
            <h1 className="text-xl font-semibold tracking-tight text-[#F1F1F1]">
              Welcome back
            </h1>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "hsl(210, 4%, 50%)" }}
            >
              Enter your credentials to access your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "hsl(210, 4%, 50%)" }}
              >
                Email
              </label>
              <input
                ref={emailInputRef}
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-md border border-[hsl(210,5%,12%)] bg-[hsl(210,8%,8%)] px-3.5 py-2.5 text-sm text-[#F1F1F1] placeholder:text-[hsl(210,4%,35%)] focus:outline-none focus:ring-1 focus:ring-[hsl(210,5%,22%)] focus:border-[hsl(210,5%,22%)] transition-colors"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "hsl(210, 4%, 50%)" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-md border border-[hsl(210,5%,12%)] bg-[hsl(210,8%,8%)] px-3.5 py-2.5 pr-10 text-sm text-[#F1F1F1] placeholder:text-[hsl(210,4%,35%)] focus:outline-none focus:ring-1 focus:ring-[hsl(210,5%,22%)] focus:border-[hsl(210,5%,22%)] transition-colors"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "hsl(210, 4%, 40%)" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs" style={{ color: "#C61030" }} role="alert">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full rounded-md bg-[#F1F1F1] text-[#060809] px-4 py-2.5 text-sm font-medium hover:bg-[#F1F1F1]/90 focus:outline-none focus:ring-2 focus:ring-[#F1F1F1]/30 focus:ring-offset-2 focus:ring-offset-[hsl(210,8%,5.5%)] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-[#060809]/30 border-t-[#060809] rounded-full animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p
            className="text-center text-xs mt-6"
            style={{ color: "hsl(210, 4%, 45%)" }}
          >
            {"Don't have an account? "}
            <button className="text-[#F1F1F1] hover:underline font-medium">
              Contact your administrator
            </button>
          </p>

          {/* Back button to collapse */}
          <button
            onClick={() => setShowCredentials(false)}
            className="mt-5 flex items-center justify-center gap-1.5 text-xs w-full transition-colors"
            style={{ color: "hsl(210, 4%, 40%)" }}
          >
            <ArrowRight className="h-3 w-3 rotate-180" />
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
