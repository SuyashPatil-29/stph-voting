"use client";

import { useState } from "react";
import Image from "next/image";
import type { GroupWithCandidates } from "@/lib/queries";
import {
  renameGroup,
  deleteGroup,
  setGroupPhoto,
  removeGroupPhoto,
  createCandidate,
  updateCandidate,
  deleteCandidate,
} from "@/lib/actions";

type Candidate = GroupWithCandidates["candidates"][number];

function ConfirmSubmit({
  children,
  message,
  className,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

function Avatar({ candidate }: { candidate: Candidate }) {
  if (candidate.photoUrl) {
    return (
      <Image
        src={candidate.photoUrl}
        alt={candidate.name}
        width={48}
        height={48}
        className="h-12 w-12 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-base font-semibold text-slate-400">
      {candidate.name.charAt(0).toUpperCase()}
    </div>
  );
}

function CandidateRow({ candidate }: { candidate: Candidate }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <form
          action={async (fd) => {
            await updateCandidate(fd);
            setEditing(false);
          }}
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="candidateId" value={candidate.id} />
          <div className="flex flex-wrap gap-2">
            <input
              name="name"
              defaultValue={candidate.name}
              required
              placeholder="Name"
              className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
            <input
              name="class"
              defaultValue={candidate.class ?? ""}
              placeholder="Class"
              className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <label className="text-xs text-slate-500">
            Replace photo (optional)
            <input
              type="file"
              name="photo"
              accept="image/*"
              className="mt-1 block w-full text-xs"
            />
          </label>
          <div className="flex gap-2">
            <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
      <Avatar candidate={candidate} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-slate-800">
          {candidate.name}
        </div>
        {candidate.class && (
          <div className="text-sm text-slate-500">{candidate.class}</div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
      >
        Edit
      </button>
      <form action={deleteCandidate}>
        <input type="hidden" name="candidateId" value={candidate.id} />
        <ConfirmSubmit
          message={`Delete candidate "${candidate.name}"?`}
          className="rounded-md px-2 py-1 text-sm text-red-500 hover:bg-red-50"
        >
          Delete
        </ConfirmSubmit>
      </form>
    </li>
  );
}

export function GroupCard({ group }: { group: GroupWithCandidates }) {
  const [renaming, setRenaming] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      {/* Group header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        {renaming ? (
          <form
            action={async (fd) => {
              await renameGroup(fd);
              setRenaming(false);
            }}
            className="flex flex-1 items-center gap-2"
          >
            <input type="hidden" name="groupId" value={group.id} />
            <input
              name="name"
              defaultValue={group.name}
              required
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-lg font-semibold"
            />
            <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
              Save
            </button>
            <button
              type="button"
              onClick={() => setRenaming(false)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <h3 className="text-xl font-bold text-slate-800">{group.name}</h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRenaming(true)}
                className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              >
                Rename
              </button>
              <form action={deleteGroup}>
                <input type="hidden" name="groupId" value={group.id} />
                <ConfirmSubmit
                  message={`Delete group "${group.name}" and all its candidates? Any votes for it will also be removed.`}
                  className="rounded-md px-2 py-1 text-sm text-red-500 hover:bg-red-50"
                >
                  Delete group
                </ConfirmSubmit>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Group image */}
      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 p-3">
        {group.photoUrl ? (
          <Image
            src={group.photoUrl}
            alt={group.name}
            width={64}
            height={64}
            className="h-16 w-16 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-2xl text-slate-400">
            🏳️
          </div>
        )}
        <form
          action={setGroupPhoto}
          className="flex flex-1 flex-wrap items-center gap-2"
        >
          <input type="hidden" name="groupId" value={group.id} />
          <input
            type="file"
            name="photo"
            accept="image/*"
            required
            className="text-xs"
          />
          <button className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900">
            {group.photoUrl ? "Replace image" : "Add image"}
          </button>
        </form>
        {group.photoUrl && (
          <form action={removeGroupPhoto}>
            <input type="hidden" name="groupId" value={group.id} />
            <ConfirmSubmit
              message={`Remove the image for "${group.name}"?`}
              className="rounded-md px-2 py-1 text-sm text-red-500 hover:bg-red-50"
            >
              Remove image
            </ConfirmSubmit>
          </form>
        )}
      </div>

      {/* Candidates */}
      <ul className="flex flex-col gap-2">
        {group.candidates.map((c) => (
          <CandidateRow key={c.id} candidate={c} />
        ))}
        {group.candidates.length === 0 && (
          <li className="text-sm italic text-slate-400">No candidates yet.</li>
        )}
      </ul>

      {/* Add candidate */}
      <form
        action={createCandidate}
        className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4"
      >
        <input type="hidden" name="groupId" value={group.id} />
        <div className="flex flex-1 flex-col">
          <label className="text-xs text-slate-500">Name</label>
          <input
            name="name"
            required
            placeholder="Candidate name"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-slate-500">Class</label>
          <input
            name="class"
            placeholder="e.g. 12-A"
            className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-slate-500">Photo</label>
          <input
            type="file"
            name="photo"
            accept="image/*"
            className="text-xs"
          />
        </div>
        <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900">
          + Add
        </button>
      </form>
    </div>
  );
}
