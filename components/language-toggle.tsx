"use client";

import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useI18n, locales, localeNames, type Locale } from "@/lib/i18n";

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        aria-label={t("header.toggleLanguage")}
      >
        <Globe className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 min-w-[140px] rounded-md border border-border bg-card shadow-lg z-50">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => {
                setLocale(loc as Locale);
                setIsOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-secondary transition-colors first:rounded-t-md last:rounded-b-md ${
                locale === loc ? "bg-secondary" : ""
              }`}
            >
              <span className="text-xs font-medium uppercase text-muted-foreground">{loc}</span>
              <span className="text-foreground">{localeNames[loc as Locale]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
