import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const electionStatus = pgEnum("election_status", ["active", "archived"]);

// An election is the top-level container. Only one row should ever be
// `active` at a time — enforced in application code (the reset action
// archives the current active election before creating a new one).
export const elections = pgTable("elections", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  status: electionStatus("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

// A group is a slate/party the student votes for as a whole.
export const groups = pgTable(
  "groups",
  {
    id: serial("id").primaryKey(),
    electionId: integer("election_id")
      .notNull()
      .references(() => elections.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
  },
  (t) => [index("groups_election_id_idx").on(t.electionId)],
);

// Candidates are just the roster shown under a group; votes are not
// cast for an individual candidate.
export const candidates = pgTable(
  "candidates",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    class: text("class"),
    photoUrl: text("photo_url"),
  },
  (t) => [index("candidates_group_id_idx").on(t.groupId)],
);

// One row per vote cast. A vote points at a group (and its election,
// denormalized so tallies survive even if a group were removed).
export const votes = pgTable(
  "votes",
  {
    id: serial("id").primaryKey(),
    electionId: integer("election_id")
      .notNull()
      .references(() => elections.id, { onDelete: "cascade" }),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("votes_election_id_idx").on(t.electionId),
    index("votes_group_id_idx").on(t.groupId),
  ],
);

// --- Relations (used by the drizzle relational query API) ---

export const electionsRelations = relations(elections, ({ many }) => ({
  groups: many(groups),
  votes: many(votes),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  election: one(elections, {
    fields: [groups.electionId],
    references: [elections.id],
  }),
  candidates: many(candidates),
  votes: many(votes),
}));

export const candidatesRelations = relations(candidates, ({ one }) => ({
  group: one(groups, {
    fields: [candidates.groupId],
    references: [groups.id],
  }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  election: one(elections, {
    fields: [votes.electionId],
    references: [elections.id],
  }),
  group: one(groups, {
    fields: [votes.groupId],
    references: [groups.id],
  }),
}));

export type Election = typeof elections.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type Vote = typeof votes.$inferSelect;
