import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  timestamp,
  index,
  customType,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Postgres `bytea` — drizzle has no built-in helper, so define one.
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

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
    // Optional group logo/banner. Nullable so existing rows are untouched.
    photoUrl: text("photo_url"),
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

// Uploaded images live in the DB itself (bytea) so nothing depends on the
// local/serverless filesystem. Kept in a dedicated table so pulling a
// group/candidate row never drags the binary blob along with it — the blob
// is only read by the /api/images/[id] route handler.
export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  mimeType: text("mime_type").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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

export type Image = typeof images.$inferSelect;
export type Election = typeof elections.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type Vote = typeof votes.$inferSelect;
