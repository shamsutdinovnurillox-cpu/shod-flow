// (app) segmenti uchun yuklanish holati (route o'tishlarida skeleton).
// Sahifa tuzilishini taqlid qiladi — shunda kontent kelganda siljish bo'lmaydi.
export default function AppLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Yuklanmoqda">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="skeleton h-7 w-44" />
          <div className="skeleton h-3.5 w-64" />
        </div>
        <div className="skeleton h-9 w-32 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton mt-3 h-7 w-24" />
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-border bg-surface-2/70 px-6 py-3">
          <div className="skeleton h-3.5 w-32" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="skeleton h-4 w-1/5" />
              <div className="skeleton h-4 w-1/6" />
              <div className="skeleton h-4 w-1/4" />
              <div className="skeleton ml-auto h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
