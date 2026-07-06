"use server";

import { db } from "@/db";
import { elections, groups, candidates, votes, images } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// NOTE: There is intentionally no authentication here. The security model
// for this kiosk is physical (one trusted machine on a local network).
// TODO(v1): add admin auth before exposing /admin beyond the local device.

async function requireActiveElection() {
  const active = await db.query.elections.findFirst({
    where: eq(elections.status, "active"),
  });
  if (!active) {
    throw new Error("No active election. Reset/create one first.");
  }
  return active;
}

// Reject anything larger than this to keep DB rows sane. Must stay under the
// Server Action bodySizeLimit configured in next.config.ts.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB

/**
 * Store an uploaded image as a bytea row in Postgres and return a URL that
 * the /api/images/[id] route handler serves it from. Returns null when no
 * file was provided (so callers can leave photoUrl unchanged).
 */
async function savePhoto(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (!file.type.startsWith("image/")) {
    throw new Error("Uploaded file must be an image.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large (max 4 MB).");
  }

  const data = Buffer.from(await file.arrayBuffer());
  const [row] = await db
    .insert(images)
    .values({ mimeType: file.type, data })
    .returning({ id: images.id });

  return `/api/images/${row.id}`;
}

// --------------------------------------------------------------------------
// Groups
// --------------------------------------------------------------------------

export async function createGroup(formData: FormData) {
  const active = await requireActiveElection();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Group name is required.");

  // Append to the end of the current display order.
  const existing = await db.query.groups.findMany({
    where: eq(groups.electionId, active.id),
    columns: { displayOrder: true },
  });
  const nextOrder =
    existing.reduce((max, g) => Math.max(max, g.displayOrder), -1) + 1;

  const photoUrl = await savePhoto(formData.get("photo") as File | null);

  await db.insert(groups).values({
    electionId: active.id,
    name,
    displayOrder: nextOrder,
    photoUrl,
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

/**
 * Add or replace the image on an existing group without touching any other
 * data. Safe to run against groups that already have candidates/votes.
 */
export async function setGroupPhoto(formData: FormData) {
  const id = Number(formData.get("groupId"));
  if (!id) throw new Error("Group id is required.");

  const photoUrl = await savePhoto(formData.get("photo") as File | null);
  if (!photoUrl) throw new Error("Please choose an image to upload.");

  await db.update(groups).set({ photoUrl }).where(eq(groups.id, id));
  revalidatePath("/admin");
  revalidatePath("/");
}

/** Remove a group's image (keeps the group and everything else). */
export async function removeGroupPhoto(formData: FormData) {
  const id = Number(formData.get("groupId"));
  if (!id) throw new Error("Group id is required.");

  await db.update(groups).set({ photoUrl: null }).where(eq(groups.id, id));
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function renameGroup(formData: FormData) {
  const id = Number(formData.get("groupId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) throw new Error("Group id and name are required.");

  await db.update(groups).set({ name }).where(eq(groups.id, id));
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteGroup(formData: FormData) {
  const id = Number(formData.get("groupId"));
  if (!id) throw new Error("Group id is required.");

  // Candidates and votes cascade via FK ON DELETE CASCADE.
  await db.delete(groups).where(eq(groups.id, id));
  revalidatePath("/admin");
  revalidatePath("/");
}

// --------------------------------------------------------------------------
// Candidates
// --------------------------------------------------------------------------

export async function createCandidate(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  const name = String(formData.get("name") ?? "").trim();
  const klass = String(formData.get("class") ?? "").trim() || null;
  if (!groupId || !name) throw new Error("Group and candidate name required.");

  const photoUrl = await savePhoto(formData.get("photo") as File | null);

  await db.insert(candidates).values({
    groupId,
    name,
    class: klass,
    photoUrl,
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function updateCandidate(formData: FormData) {
  const id = Number(formData.get("candidateId"));
  const name = String(formData.get("name") ?? "").trim();
  const klass = String(formData.get("class") ?? "").trim() || null;
  if (!id || !name) throw new Error("Candidate id and name required.");

  const newPhoto = await savePhoto(formData.get("photo") as File | null);

  await db
    .update(candidates)
    .set({
      name,
      class: klass,
      // Only overwrite the photo if a new one was uploaded.
      ...(newPhoto ? { photoUrl: newPhoto } : {}),
    })
    .where(eq(candidates.id, id));

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteCandidate(formData: FormData) {
  const id = Number(formData.get("candidateId"));
  if (!id) throw new Error("Candidate id is required.");

  await db.delete(candidates).where(eq(candidates.id, id));
  revalidatePath("/admin");
  revalidatePath("/");
}

// --------------------------------------------------------------------------
// Voting
// --------------------------------------------------------------------------

export async function castVote(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  if (!groupId) throw new Error("A group must be selected.");

  const active = await requireActiveElection();

  // Guard: the chosen group must belong to the active election.
  const group = await db.query.groups.findFirst({
    where: and(eq(groups.id, groupId), eq(groups.electionId, active.id)),
  });
  if (!group) throw new Error("Selected group is not part of this election.");

  await db.insert(votes).values({
    electionId: active.id,
    groupId,
  });

  // Refresh the dashboard tallies; the kiosk handles its own thank-you UI.
  revalidatePath("/admin/dashboard");
}

// --------------------------------------------------------------------------
// Election lifecycle
// --------------------------------------------------------------------------

/**
 * Archive the current active election (preserving all history) and open a
 * fresh empty active election. Destructive to the *live* voting screen only.
 */
export async function resetElection(formData: FormData) {
  const title =
    String(formData.get("title") ?? "").trim() ||
    `Election ${new Date().toISOString().slice(0, 10)}`;

  await db.transaction(async (tx) => {
    const active = await tx.query.elections.findFirst({
      where: eq(elections.status, "active"),
    });

    if (active) {
      await tx
        .update(elections)
        .set({ status: "archived", archivedAt: new Date() })
        .where(eq(elections.id, active.id));
    }

    await tx.insert(elections).values({ title, status: "active" });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/history");
  revalidatePath("/");
  redirect("/admin");
}

/**
 * Wipe all votes for the current active election without archiving it or
 * touching its groups/candidates. Resets the live tallies to zero so the
 * same ballot can be re-run. Destructive to counts only.
 */
export async function clearVotes() {
  const active = await requireActiveElection();
  await db.delete(votes).where(eq(votes.electionId, active.id));

  revalidatePath("/admin");
  revalidatePath("/admin/dashboard");
}

/** Rename the active election (used on the setup screen). */
export async function renameElection(formData: FormData) {
  const active = await requireActiveElection();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required.");

  await db.update(elections).set({ title }).where(eq(elections.id, active.id));
  revalidatePath("/admin");
  revalidatePath("/");
}
