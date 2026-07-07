"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { globalSearch, type SearchHit } from "@/app/actions/search";

const KIND_STYLES: Record<string, string> = {
  Truck: "bg-blue-50 text-blue-700",
  Trailer: "bg-indigo-50 text-indigo-700",
  Driver: "bg-emerald-50 text-emerald-700",
  CargoClaim: "bg-red-50 text-red-700",
  Inspection: "bg-yellow-50 text-yellow-700",
  Document: "bg-gray-100 text-gray-600",
};

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced qidiruv
  useEffect(() => {
    if (q.trim().length < 2) {
      // Bo'sh so'rovni keyingi tick'da tozalaymiz (cascading render'siz).
      const clear = setTimeout(() => setHits([]), 0);
      return () => clearTimeout(clear);
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await globalSearch(q);
        setHits(res);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  // Tashqariga bosilganda yopish
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (hit: SearchHit) => {
    setOpen(false);
    setQ("");
    if (hit.href.startsWith("/")) router.push(hit.href);
    else window.open(hit.href, "_blank");
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          placeholder="Search unit, VIN, plate, driver, CDL, claim…"
          className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-9 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
      </div>

      {open && (
        <div className="absolute z-50 mt-2 w-full max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
          {hits.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">
              {q.trim().length < 2 ? "Type at least 2 characters" : "No results found."}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {hits.map((h) => (
                <li key={`${h.kind}-${h.id}`}>
                  <button onClick={() => go(h)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${KIND_STYLES[h.kind] ?? "bg-gray-100 text-gray-600"}`}>{h.kind}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">{h.title}</span>
                      <span className="block truncate text-xs text-gray-500">{h.subtitle}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
