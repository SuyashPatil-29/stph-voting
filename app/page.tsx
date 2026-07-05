import Link from "next/link";
import {
  getActiveElection,
  getGroupsWithCandidates,
} from "@/lib/queries";
import { castVote } from "@/lib/actions";
import VoteBooth from "./vote-booth";

// Always read live data — the kiosk must reflect the current election setup.
export const dynamic = "force-dynamic";

export default async function VotePage() {
  const election = await getActiveElection();
  const groups = election ? await getGroupsWithCandidates(election.id) : [];

  const votingOpen = election !== null && groups.length > 0;

  if (!votingOpen) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-10 text-center">
        <div className="text-6xl">🗳️</div>
        <h1 className="text-3xl font-semibold text-slate-800">
          Voting is not open yet
        </h1>
        <p className="max-w-md text-lg text-slate-500">
          {election
            ? "This election has no groups set up yet. Please check back shortly."
            : "There is no active election right now. Please check back shortly."}
        </p>
        <Link
          href="/admin"
          className="mt-4 text-sm text-slate-400 underline underline-offset-4"
        >
          Admin
        </Link>
      </main>
    );
  }

  return (
    <VoteBooth
      electionTitle={election!.title}
      groups={groups}
      castVoteAction={castVote}
    />
  );
}
