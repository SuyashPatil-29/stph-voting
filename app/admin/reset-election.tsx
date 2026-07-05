"use client";

import { useState } from "react";

export default function ResetElection({
  resetAction,
}: {
  resetAction: (formData: FormData) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
      >
        Reset election…
      </button>
    );
  }

  return (
    <form action={resetAction} className="flex flex-col gap-3">
      <p className="text-sm font-medium text-red-800">
        This archives the current election and starts a new empty one. Are you
        sure?
      </p>
      <input
        name="title"
        placeholder="New election title (optional)"
        className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700">
          Yes, archive &amp; start fresh
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
