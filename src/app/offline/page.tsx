import Link from "next/link";
import { CloudOff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <span className="rounded-2xl bg-slate-200 p-4 text-slate-600">
        <CloudOff className="h-8 w-8" />
      </span>
      <h1 className="mt-5 text-xl font-semibold text-slate-900">You are offline</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Check-in entries you make while offline are stored on this device and sync automatically when
        you reconnect.
      </p>
      <Link href="/attendance" className={`${buttonVariants()} mt-6`}>
        Back to attendance
      </Link>
    </div>
  );
}
