import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import {
  getElection,
  getTallies,
  getGroupsWithCandidates,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HistoryDetailPage({
  params,
}: PageProps<"/admin/history/[id]">) {
  const { id } = await params;
  const electionId = Number(id);
  if (!Number.isInteger(electionId)) notFound();

  const election = await getElection(electionId);
  if (!election) notFound();

  const [{ totalVotes, groups: tallies }, rosters] = await Promise.all([
    getTallies(electionId),
    getGroupsWithCandidates(electionId),
  ]);

  const rosterById = new Map(rosters.map((g) => [g.id, g]));
  const leaderCount = Math.max(0, ...tallies.map((t) => t.votes));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/history"
          className="text-sm text-slate-500 underline underline-offset-4"
        >
          ← All past elections
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">
          {election.title}
        </h1>
        <p className="text-slate-500">
          {election.status === "archived" ? "Archived" : "Active"}
          {election.archivedAt
            ? ` · ${new Date(election.archivedAt).toLocaleString()}`
            : ""}{" "}
          · {totalVotes} total vote{totalVotes === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {tallies.map((t) => {
          const roster = rosterById.get(t.groupId);
          const pct =
            totalVotes > 0 ? Math.round((t.votes / totalVotes) * 100) : 0;
          const isLeader = t.votes > 0 && t.votes === leaderCount;
          return (
            <div
              key={t.groupId}
              className={[
                "rounded-2xl border bg-white p-5",
                isLeader ? "border-emerald-300 ring-1 ring-emerald-200" : "border-slate-200",
              ].join(" ")}
            >
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-800">
                  {t.name}
                  {isLeader && (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      Winner
                    </span>
                  )}
                </h2>
                <span className="text-sm tabular-nums text-slate-500">
                  {t.votes} vote{t.votes === 1 ? "" : "s"} · {pct}%
                </span>
              </div>

              <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <ul className="flex flex-wrap gap-4">
                {roster?.candidates.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    {c.photoUrl ? (
                      <Image
                        src={c.photoUrl}
                        alt={c.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-400">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-slate-800">
                        {c.name}
                      </div>
                      {c.class && (
                        <div className="text-xs text-slate-500">{c.class}</div>
                      )}
                    </div>
                  </li>
                ))}
                {(!roster || roster.candidates.length === 0) && (
                  <li className="text-sm italic text-slate-400">
                    No candidates recorded.
                  </li>
                )}
              </ul>
            </div>
          );
        })}
        {tallies.length === 0 && (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
            This election had no groups.
          </p>
        )}
      </div>
    </div>
  );
}
