"use client";

import { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useTheme } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";
import { LanguageToggle } from "./language-toggle";
import { useTranslation } from "@/lib/i18n";

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
  const { theme } = useTheme();
  const { t } = useTranslation();

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
    <div className="flex min-h-screen bg-background overflow-hidden">
      {/* Theme and language toggle - floating */}
      <div className="fixed top-4 right-4 z-[60] flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

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
          className={`absolute top-[10%] right-[-10%] w-[70vw] h-[80vh] rounded-full blur-[120px] pointer-events-none ${
            theme === "dark" ? "opacity-[0.55]" : "opacity-[0.45]"
          }`}
          style={{
            background:
              "radial-gradient(ellipse at center, #C61030 0%, #C8266E 40%, transparent 70%)",
          }}
        />

        {/* Cyan/blue accent glow - top right corner */}
        <div
          className={`absolute top-[-15%] right-[-5%] w-[35vw] h-[35vh] rounded-full blur-[80px] pointer-events-none ${
            theme === "dark" ? "opacity-[0.7]" : "opacity-[0.55]"
          }`}
          style={{
            background:
              "radial-gradient(circle, #6EE1FC 0%, #233BA8 50%, transparent 75%)",
          }}
        />

        {/* Deep blue mid-layer for the transition between cyan and red */}
        <div
          className={`absolute top-[5%] right-[10%] w-[45vw] h-[55vh] rounded-full blur-[100px] pointer-events-none ${
            theme === "dark" ? "opacity-[0.4]" : "opacity-[0.3]"
          }`}
          style={{
            background:
              "radial-gradient(ellipse at center, #233BA8 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-10 px-8">
          {/* Logo */}
          <Image
            src={
              theme === "dark"
                ? "/images/mocerto-logo-white-transparent.png"
                : "/images/mocerto-logo-black-transparent.png"
            }
            alt="Mocerto logo"
            width={320}
            height={86}
            style={{ width: "320px", height: "auto" }}
            className="object-contain"
            priority
          />

          {/* Product title + description */}
          <div className="flex flex-col items-center gap-4 max-w-lg">
            <h2 className="text-2xl font-semibold text-foreground tracking-tight text-center text-balance">
              {t("domain.glosadorInteligente")}
            </h2>
            <p className="text-sm text-center leading-relaxed max-w-sm text-muted-foreground">
              {t("domain.productDescription")}
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
              className="group flex items-center gap-2.5 px-8 py-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background"
            >
              {t("login.signIn")}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="absolute bottom-8 text-xs tracking-wide text-muted-foreground/60">
          {t("domain.simplifyingCommerce")}
        </p>
      </div>

      {/* Right section - Credentials panel (slides in) */}
      <div
        className={`fixed right-0 top-0 h-full flex items-center justify-center bg-background transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          showCredentials
            ? "w-full lg:w-1/2 translate-x-0 opacity-100 z-50"
            : "w-full lg:w-1/2 translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        {/* The credentials box */}
        <div
          className={`w-full max-w-md mx-6 sm:mx-auto rounded-xl border border-border bg-card p-8 sm:p-10 shadow-2xl shadow-foreground/5 transition-all duration-700 delay-100 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            showCredentials
              ? "translate-y-0 opacity-100 scale-100"
              : "translate-y-6 opacity-0 scale-[0.97]"
          }`}
        >
          {/* Mocerto icon at top of credentials box */}
          <div className="flex items-center gap-3 mb-8">
            <Image
              src={
                theme === "dark"
                  ? "/images/mocerto-icon-white-transparent.png"
                  : "/images/mocerto-icon-black.png"
              }
              alt="Mocerto"
              width={28}
              height={28}
              style={{ width: "28px", height: "auto" }}
              className="object-contain"
            />
            <div className="h-5 w-px bg-border" />
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {t("domain.secureLogin")}
            </span>
          </div>

          <div className="flex flex-col gap-2 mb-7">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {t("login.title")}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("domain.enterCredentials")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {t("login.emailLabel")}
              </label>
              <input
                ref={emailInputRef}
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("login.emailPlaceholder")}
                className="w-full rounded-md border border-border bg-secondary px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {t("login.passwordLabel")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login.passwordPlaceholder")}
                  className="w-full rounded-md border border-border bg-secondary px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors text-muted-foreground"
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
              className="flex items-center justify-center gap-2 w-full rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-card transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {t("login.signIn")}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs mt-6 text-muted-foreground">
            {t("login.noAccount")}{" "}
            <button className="text-foreground hover:underline font-medium">
              {t("domain.contactAdmin")}
            </button>
          </p>

          {/* Back button to collapse */}
          <button
            onClick={() => setShowCredentials(false)}
            className="mt-5 flex items-center justify-center gap-1.5 text-xs w-full transition-colors text-muted-foreground"
          >
            <ArrowRight className="h-3 w-3 rotate-180" />
            {t("common.back")}
          </button>
        </div>
      </div>
    </div>
  );
}
