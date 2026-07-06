"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearVotes } from "@/lib/actions";

export default function ClearVotes({ totalVotes }: { totalVotes: number }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClear() {
    startTransition(async () => {
      await clearVotes();
      setConfirming(false);
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={totalVotes === 0}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
      >
        Clear counts
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-red-700">
        Delete all {totalVotes} vote{totalVotes === 1 ? "" : "s"}?
      </span>
      <button
        type="button"
        onClick={handleClear}
        disabled={isPending}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
      >
        {isPending ? "Clearing…" : "Yes, reset to zero"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={isPending}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
      >
        Cancel
      </button>
    </div>
  );
}
