// (app) segmenti uchun yuklanish holati (route o'tishlarida skeleton/spinner).
export default function AppLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 text-muted">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-blue-600" />
        <span className="text-sm font-medium">Yuklanmoqda…</span>
      </div>
    </div>
  );
}
