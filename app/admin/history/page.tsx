import Link from "next/link";
import { getArchivedElections, getTallies } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const archived = await getArchivedElections();

  // Total votes per archived election, for a quick summary in the list.
  const withTotals = await Promise.all(
    archived.map(async (e) => ({
      ...e,
      total: (await getTallies(e.id)).totalVotes,
    })),
  );

  if (withTotals.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
        No archived elections yet. Past elections appear here after a reset.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-800">Past elections</h1>
      <ul className="flex flex-col gap-3">
        {withTotals.map((e) => (
          <li key={e.id}>
            <Link
              href={`/admin/history/${e.id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-sm"
            >
              <div>
                <div className="text-lg font-semibold text-slate-800">
                  {e.title}
                </div>
                <div className="text-sm text-slate-500">
                  Archived{" "}
                  {e.archivedAt
                    ? new Date(e.archivedAt).toLocaleString()
                    : "—"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold tabular-nums text-slate-800">
                  {e.total}
                </div>
                <div className="text-xs text-slate-400">votes</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
