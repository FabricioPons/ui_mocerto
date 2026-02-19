"use client";

import { useState } from "react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsLoading(true);
    // Simulate auth delay
    await new Promise((r) => setTimeout(r, 1200));
    setIsLoading(false);
    onLogin();
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center overflow-hidden bg-[#060809]">
        {/* Subtle gradient glow */}
        <div
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-30 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, hsla(346, 85%, 55%, 0.6) 0%, hsla(190, 85%, 55%, 0.3) 60%, transparent 100%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-10 px-12">
          <Image
            src="/images/mocerto-logo-white.jpg"
            alt="Mocerto logo"
            width={320}
            height={100}
            style={{ width: "320px", height: "auto" }}
            className="object-contain"
            priority
          />
          <div className="flex flex-col items-center gap-4 max-w-md">
            <h2 className="text-2xl font-semibold text-foreground tracking-tight text-center text-balance">
              Glosador Inteligente
            </h2>
            <p className="text-muted-foreground text-center text-sm leading-relaxed">
              Your AI-powered copilot for customs compliance. Detect errors,
              inconsistencies, and risks before submission.
            </p>
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="absolute bottom-8 text-xs text-muted-foreground tracking-wide">
          Simplifying international commerce
        </p>
      </div>

      {/* Right side - Login Form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 bg-background">
        {/* Mobile logo */}
        <div className="lg:hidden mb-10">
          <Image
            src="/images/mocerto-logo-black.jpg"
            alt="Mocerto logo"
            width={200}
            height={60}
            style={{ width: "200px", height: "auto" }}
            className="object-contain"
            priority
          />
        </div>

        <div className="w-full max-w-sm flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Sign in
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-md border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
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
                  className="w-full rounded-md border border-border bg-card px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            {"Don't have an account? "}
            <button className="text-foreground hover:underline font-medium">
              Contact your administrator
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
