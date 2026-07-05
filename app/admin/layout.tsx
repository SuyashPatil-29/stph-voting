import Link from "next/link";
import type { ReactNode } from "react";
import AdminNav from "./admin-nav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗳️</span>
            <span className="text-lg font-bold text-slate-800">
              Polling Admin
            </span>
          </div>
          <AdminNav />
          <Link
            href="/"
            target="_blank"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Open kiosk ↗
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
