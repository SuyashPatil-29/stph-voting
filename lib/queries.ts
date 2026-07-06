import "server-only";
import { db } from "@/db";
import { elections, groups, candidates, votes } from "@/db/schema";
import { eq, sql, desc, asc, and } from "drizzle-orm";

export type GroupWithCandidates = {
  id: number;
  name: string;
  displayOrder: number;
  photoUrl: string | null;
  candidates: {
    id: number;
    name: string;
    class: string | null;
    photoUrl: string | null;
  }[];
};

/** The single active election, or null if none is open. */
export async function getActiveElection() {
  return (
    (await db.query.elections.findFirst({
      where: eq(elections.status, "active"),
    })) ?? null
  );
}

/** Groups (with their candidate rosters) for an election, in display order. */
export async function getGroupsWithCandidates(
  electionId: number,
): Promise<GroupWithCandidates[]> {
  const rows = await db.query.groups.findMany({
    where: eq(groups.electionId, electionId),
    orderBy: [asc(groups.displayOrder), asc(groups.id)],
    with: {
      candidates: {
        orderBy: [asc(candidates.id)],
      },
    },
  });

  return rows.map((g) => ({
    id: g.id,
    name: g.name,
    displayOrder: g.displayOrder,
    photoUrl: g.photoUrl,
    candidates: g.candidates.map((c) => ({
      id: c.id,
      name: c.name,
      class: c.class,
      photoUrl: c.photoUrl,
    })),
  }));
}

export type GroupTally = {
  groupId: number;
  name: string;
  displayOrder: number;
  votes: number;
};

/** Vote counts per group for an election (groups with 0 votes included). */
export async function getTallies(electionId: number): Promise<{
  totalVotes: number;
  groups: GroupTally[];
}> {
  const rows = await db
    .select({
      groupId: groups.id,
      name: groups.name,
      displayOrder: groups.displayOrder,
      votes: sql<number>`count(${votes.id})::int`,
    })
    .from(groups)
    .leftJoin(
      votes,
      and(eq(votes.groupId, groups.id), eq(votes.electionId, electionId)),
    )
    .where(eq(groups.electionId, electionId))
    .groupBy(groups.id, groups.name, groups.displayOrder)
    .orderBy(asc(groups.displayOrder), asc(groups.id));

  const totalVotes = rows.reduce((sum, r) => sum + r.votes, 0);
  return { totalVotes, groups: rows };
}

/** All archived elections, most recently archived first. */
export async function getArchivedElections() {
  return db.query.elections.findMany({
    where: eq(elections.status, "archived"),
    orderBy: [desc(elections.archivedAt), desc(elections.id)],
  });
}

/** A single election by id (any status). */
export async function getElection(id: number) {
  return (
    (await db.query.elections.findFirst({
      where: eq(elections.id, id),
    })) ?? null
  );
}
