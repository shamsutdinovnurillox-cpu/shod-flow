"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

// `.dark` klassini tashqi holat sifatida o'qiymiz (no-flash skript o'rnatadi).
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const toggle = () => {
    const el = document.documentElement;
    const next = !el.classList.contains("dark");
    el.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Yorug' rejim" : "Tungi rejim"}
      title={dark ? "Yorug' rejimga o'tish" : "Tungi rejimga o'tish"}
      className="btn btn-ghost btn-icon"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
