"use server";

import { db } from "@/db";
import { elections, groups, candidates, votes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// NOTE: There is intentionally no authentication here. The security model
// for this kiosk is physical (one trusted machine on a local network).
// TODO(v1): add admin auth before exposing /admin beyond the local device.

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function requireActiveElection() {
  const active = await db.query.elections.findFirst({
    where: eq(elections.status, "active"),
  });
  if (!active) {
    throw new Error("No active election. Reset/create one first.");
  }
  return active;
}

/** Persist an uploaded image to /public/uploads and return its public path. */
async function savePhoto(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (!file.type.startsWith("image/")) {
    throw new Error("Uploaded file must be an image.");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(file.name) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);
  return `/uploads/${filename}`;
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

  await db.insert(groups).values({
    electionId: active.id,
    name,
    displayOrder: nextOrder,
  });

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

/** Rename the active election (used on the setup screen). */
export async function renameElection(formData: FormData) {
  const active = await requireActiveElection();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required.");

  await db.update(elections).set({ title }).where(eq(elections.id, active.id));
  revalidatePath("/admin");
  revalidatePath("/");
}
