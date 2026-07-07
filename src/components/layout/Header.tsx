"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const { data: session } = useSession();
  const initials = (session?.user?.name ?? "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface/80 px-6 backdrop-blur">
      <div className="flex flex-1 items-center gap-4 max-w-md">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <div className="h-8 w-px bg-border" />

        <Link
          href="/account"
          title="Account settings"
          className="flex items-center gap-3 rounded-lg px-1.5 py-1 transition-colors hover:bg-surface-2"
        >
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-sm font-semibold text-fg">{session?.user?.name}</span>
            <span className="text-xs font-medium text-muted">
              {session?.user?.role} · {session?.user?.department}
            </span>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 text-xs font-bold text-white">
            {initials}
          </div>
        </Link>

        <div className="h-8 w-px bg-border" />

        <button
          onClick={() => signOut()}
          title="Logout"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
