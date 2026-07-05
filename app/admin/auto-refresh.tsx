"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Periodically calls router.refresh() so the server-rendered dashboard
 * re-fetches live tallies. Kiosk-simple: no websockets needed.
 */
export default function AutoRefresh({
  intervalMs = 4000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();
  const [on, setOn] = useState(true);

  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [on, intervalMs, router]);

  return (
    <label className="flex items-center gap-2 text-sm text-slate-500">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => setOn(e.target.checked)}
        className="h-4 w-4"
      />
      Auto-refresh (every {Math.round(intervalMs / 1000)}s)
    </label>
  );
}
