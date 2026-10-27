import { AlertCircle, CheckCircle2 } from "lucide-react";

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;

  if (error) {
    return (
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{ok}</span>
    </div>
  );
}
