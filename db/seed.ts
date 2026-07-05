/**
 * Seed a sample active election so the app isn't empty on first run.
 * Run with:  bun run db/seed.ts
 *
 * Safe to re-run: if an active election already exists, it does nothing.
 */
import { db } from "./index";
import { elections, groups, candidates } from "./schema";
import { eq } from "drizzle-orm";

async function seed() {
  const existingActive = await db.query.elections.findFirst({
    where: eq(elections.status, "active"),
  });

  if (existingActive) {
    console.log(
      `An active election already exists (#${existingActive.id} "${existingActive.title}"). Skipping seed.`,
    );
    return;
  }

  const [election] = await db
    .insert(elections)
    .values({ title: "Student Council Election 2026", status: "active" })
    .returning();

  const sampleGroups = [
    {
      name: "The Progressives",
      order: 0,
      members: [
        { name: "Aarav Sharma", class: "12-A" },
        { name: "Isha Patel", class: "12-B" },
      ],
    },
    {
      name: "United Students",
      order: 1,
      members: [
        { name: "Rohan Mehta", class: "11-A" },
        { name: "Sara Khan", class: "11-C" },
      ],
    },
    {
      name: "Campus Forward",
      order: 2,
      members: [
        { name: "Diya Nair", class: "12-C" },
        { name: "Kabir Singh", class: "11-B" },
      ],
    },
  ];

  for (const g of sampleGroups) {
    const [group] = await db
      .insert(groups)
      .values({
        electionId: election.id,
        name: g.name,
        displayOrder: g.order,
      })
      .returning();

    await db.insert(candidates).values(
      g.members.map((m) => ({
        groupId: group.id,
        name: m.name,
        class: m.class,
        photoUrl: null,
      })),
    );
  }

  console.log(
    `Seeded election #${election.id} "${election.title}" with ${sampleGroups.length} groups.`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
