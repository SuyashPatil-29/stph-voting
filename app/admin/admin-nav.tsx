"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin", label: "Setup" },
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/history", label: "History" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 rounded-xl bg-slate-100 p-1">
      {tabs.map((tab) => {
        const active =
          tab.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
