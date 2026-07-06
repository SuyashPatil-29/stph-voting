import Link from "next/link";
import {
  getActiveElection,
  getGroupsWithCandidates,
} from "@/lib/queries";
import {
  createGroup,
  renameElection,
  resetElection,
} from "@/lib/actions";
import { GroupCard } from "./setup-ui";
import ResetElection from "./reset-election";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const election = await getActiveElection();

  if (!election) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <h1 className="text-xl font-semibold text-slate-800">
          No active election
        </h1>
        <p className="mt-2 text-slate-500">
          Create one to start setting up groups and candidates.
        </p>
        <form action={resetElection} className="mt-6">
          <input
            name="title"
            placeholder="Election title"
            className="mr-2 rounded-lg border border-slate-300 px-3 py-2"
          />
          <button className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700">
            Create election
          </button>
        </form>
      </div>
    );
  }

  const groups = await getGroupsWithCandidates(election.id);

  return (
    <div className="flex flex-col gap-8">
      {/* Election title */}
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Active election
        </p>
        <form
          action={renameElection}
          className="mt-2 flex flex-wrap items-center gap-2"
        >
          <input
            name="title"
            defaultValue={election.title}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xl font-semibold text-slate-800"
          />
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Save title
          </button>
        </form>
      </section>

      {/* Groups */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            Groups{" "}
            <span className="text-slate-400">({groups.length})</span>
          </h2>
        </div>

        {groups.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
            No groups yet. Add one below to appear on the ballot.
          </p>
        )}

        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>

        {/* Add group */}
        <form
          action={createGroup}
          className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-4"
        >
          <input
            name="name"
            required
            placeholder="New group name"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
          />
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Image (optional)
            <input
              type="file"
              name="photo"
              accept="image/*"
              className="text-xs"
            />
          </label>
          <button className="rounded-lg bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-900">
            + Add group
          </button>
        </form>
      </section>

      {/* Danger zone: reset */}
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <h2 className="text-base font-semibold text-red-800">Danger zone</h2>
        <p className="mt-1 text-sm text-red-700">
          Resetting archives this election (its results are preserved in
          History) and opens a fresh, empty election for a new round of voting.
        </p>
        <div className="mt-4">
          <ResetElection resetAction={resetElection} />
        </div>
      </section>

      <p className="text-center text-xs text-slate-400">
        Tip: preview the live ballot at{" "}
        <Link href="/" className="underline">
          the kiosk screen
        </Link>
        .
      </p>
    </div>
  );
}
