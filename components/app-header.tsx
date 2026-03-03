"use client";

import Image from "next/image";
import { LogOut, User } from "lucide-react";
import { useTheme } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";
import { LanguageToggle } from "./language-toggle";
import { useTranslation } from "@/lib/i18n";

interface AppHeaderProps {
  onLogout: () => void;
  onNavigateDashboard: () => void;
}

export function AppHeader({ onLogout, onNavigateDashboard }: AppHeaderProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <button
        onClick={onNavigateDashboard}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <Image
          src={
            theme === "dark"
              ? "/images/mocerto-icon-white-transparent.png"
              : "/images/mocerto-icon-black.png"
          }
          alt="Mocerto"
          width={32}
          height={32}
          style={{ width: "32px", height: "auto" }}
          className="rounded"
        />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground leading-tight">
            Glosador Inteligente
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            by Mocerto
          </span>
        </div>
      </button>

      <div className="flex items-center gap-3">
        <LanguageToggle />
        <ThemeToggle />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-foreground">Demo User</span>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-md hover:bg-secondary"
          aria-label={t("header.signOut")}
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("header.signOut")}</span>
        </button>
      </div>
    </header>
  );
}
