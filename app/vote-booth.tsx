"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import type { GroupWithCandidates } from "@/lib/queries";

type Props = {
  electionTitle: string;
  groups: GroupWithCandidates[];
  castVoteAction: (formData: FormData) => Promise<void>;
};

// How long the "thank you" confirmation stays up before resetting.
const THANK_YOU_MS = 500;

export default function VoteBooth({
  electionTitle,
  groups,
  castVoteAction,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [thankYou, setThankYou] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (selectedId === null || isPending) return;
    const formData = new FormData();
    formData.set("groupId", String(selectedId));

    startTransition(async () => {
      await castVoteAction(formData);
      setThankYou(true);
      // Return to a blank ballot for the next voter.
      setTimeout(() => {
        setSelectedId(null);
        setThankYou(false);
      }, THANK_YOU_MS);
    });
  }

  if (thankYou) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-emerald-600 p-10 text-center text-white">
        <div className="text-7xl">✅</div>
        <h1 className="text-4xl font-bold">Thank you for voting!</h1>
        <p className="text-xl text-emerald-100">
          Preparing the booth for the next voter…
        </p>
      </main>
    );
  }

  return (
    <main className="kiosk-no-select flex min-h-screen flex-col p-4 sm:p-6">
      <header className="mb-3 text-center">
        <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
          {electionTitle}
        </h1>
        <p className="mt-0.5 text-base text-slate-500">
          Tap your group, then press{" "}
          <span className="font-semibold">Submit Vote</span>.
        </p>
      </header>

      <div
        className="grid flex-1 content-start gap-3"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
        }}
      >
        {groups.map((group) => {
          const selected = group.id === selectedId;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => setSelectedId(group.id)}
              aria-pressed={selected}
              className={[
                "relative flex flex-col rounded-3xl border-4 p-4 text-left transition-all",
                selected
                  ? "border-emerald-500 bg-emerald-50 shadow-xl ring-4 ring-emerald-200"
                  : "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md",
              ].join(" ")}
            >
              {/* Selection check, pinned to the card corner. */}
              <span
                className={[
                  "absolute right-4 top-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-lg",
                  selected
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 text-transparent",
                ].join(" ")}
                aria-hidden
              >
                ✓
              </span>

              <div className="mb-3 flex flex-col items-center gap-2 text-center">
                {group.photoUrl && (
                  <Image
                    src={group.photoUrl}
                    alt={group.name}
                    width={160}
                    height={160}
                    className="h-24 w-24 shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28"
                  />
                )}
                <h2 className="text-2xl font-bold text-slate-800">
                  {group.name}
                </h2>
              </div>

              <ul className="flex flex-col gap-2">
                {group.candidates.map((c) => (
                  <li key={c.id} className="flex items-center gap-3">
                    {c.photoUrl ? (
                      <Image
                        src={c.photoUrl}
                        alt={c.name}
                        width={56}
                        height={56}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-400">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-lg font-medium text-slate-800">
                        {c.name}
                      </div>
                      {c.class && (
                        <div className="text-sm text-slate-500">{c.class}</div>
                      )}
                    </div>
                  </li>
                ))}
                {group.candidates.length === 0 && (
                  <li className="text-sm italic text-slate-400">
                    No candidates listed
                  </li>
                )}
              </ul>
            </button>
          );
        })}
      </div>

      <footer className="sticky bottom-0 mt-3 flex flex-col items-center gap-2 pt-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={selectedId === null || isPending}
          className={[
            "w-full max-w-xl rounded-2xl px-8 py-4 text-2xl font-bold transition-colors",
            selectedId === null
              ? "cursor-not-allowed bg-slate-200 text-slate-400"
              : "bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 active:bg-emerald-800",
          ].join(" ")}
        >
          {isPending
            ? "Submitting…"
            : selectedId === null
              ? "Select a group first"
              : "Submit Vote"}
        </button>
      </footer>
    </main>
  );
}
