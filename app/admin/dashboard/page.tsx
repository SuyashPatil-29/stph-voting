import { getActiveElection, getTallies } from "@/lib/queries";
import AutoRefresh from "../auto-refresh";

export const dynamic = "force-dynamic";

// A fixed palette so bars are visually distinguishable.
const BAR_COLORS = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-lime-500",
];

export default async function DashboardPage() {
  const election = await getActiveElection();

  if (!election) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
        No active election.
      </div>
    );
  }

  const { totalVotes, groups } = await getTallies(election.id);
  const leaderCount = Math.max(0, ...groups.map((g) => g.votes));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {election.title}
          </h1>
          <p className="text-slate-500">Live results</p>
        </div>
        <AutoRefresh />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Total votes" value={totalVotes} />
        <Stat label="Groups" value={groups.length} />
        <Stat
          label="Leading"
          value={
            leaderCount > 0
              ? (groups.find((g) => g.votes === leaderCount)?.name ?? "—")
              : "—"
          }
          small
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        {groups.length === 0 ? (
          <p className="text-center text-slate-500">
            No groups to tally yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {groups.map((g, i) => {
              const pct =
                totalVotes > 0 ? Math.round((g.votes / totalVotes) * 100) : 0;
              const barWidth =
                leaderCount > 0 ? (g.votes / leaderCount) * 100 : 0;
              return (
                <li key={g.groupId}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-slate-800">
                      {g.name}
                    </span>
                    <span className="text-sm tabular-nums text-slate-500">
                      {g.votes} vote{g.votes === 1 ? "" : "s"} · {pct}%
                    </span>
                  </div>
                  <div className="h-6 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${BAR_COLORS[i % BAR_COLORS.length]}`}
                      style={{ width: `${Math.max(barWidth, g.votes > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  small,
}: {
  label: string;
  value: number | string;
  small?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div
        className={
          small
            ? "mt-1 truncate text-lg font-bold text-slate-800"
            : "mt-1 text-3xl font-bold text-slate-800"
        }
      >
        {value}
      </div>
    </div>
  );
}
