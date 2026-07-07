"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
      <div className="flex flex-1 items-center gap-4 max-w-md">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end">
          <span className="text-sm font-semibold text-gray-900">{session?.user?.name}</span>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mt-1">
            {session?.user?.role} - {session?.user?.department}
          </span>
        </div>
        
        <div className="h-8 w-px bg-gray-200" />
        
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
