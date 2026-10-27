import Link from "next/link";
import { CalendarDays, Church, HandCoins, Users } from "lucide-react";

const highlights = [
  { icon: Users, label: "Members & families in one directory" },
  { icon: CalendarDays, label: "Services, events and attendance" },
  { icon: HandCoins, label: "Giving records and clear reports" },
];

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-indigo-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <Church className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">ChurchOS</p>
            <p className="text-xs text-indigo-200">Church management, simplified</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Shepherd your people with clarity and care.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-indigo-200">
            One place for your congregation, services, giving and communication.
          </p>
          <ul className="mt-8 space-y-3">
            {highlights.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm text-indigo-100">
                <span className="rounded-lg bg-white/10 p-2 ring-1 ring-white/10">
                  <item.icon className="h-4 w-4" />
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-indigo-300">
          &ldquo;Let all things be done decently and in order.&rdquo; — 1 Corinthians 14:40
        </div>
      </div>

      <div className="flex items-center justify-center bg-slate-50 px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Church className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">ChurchOS</p>
              <p className="text-xs text-slate-500">Church management, simplified</p>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>

          <div className="mt-7">{children}</div>

          {footer ? (
            <div className="mt-8 text-center text-xs text-slate-400">{footer}</div>
          ) : null}

          <p className="mt-3 text-center text-xs text-slate-400">
            <Link href="/" className="hover:text-slate-600">
              ChurchOS
            </Link>{" "}
            · Built for single congregations
          </p>
        </div>
      </div>
    </div>
  );
}
