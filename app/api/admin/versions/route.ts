import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { currentAdminEmail } from "@/lib/admins";
import { inspectDeckHtml } from "@/lib/deck-html";
import { MAX_DECK_BYTES, deleteObject, isValidStorageKey, readObject } from "@/lib/deck-storage";
import { createVersion, publishVersion } from "@/lib/deck-versions";

export const runtime = "nodejs";

/** Registers an already-uploaded deck file as a new version, optionally making it live. */
export async function POST(req: Request) {
  const email = await currentAdminEmail();
  if (!email) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { storageKey, filename, label, notes, publish } = body as {
    storageKey?: unknown;
    filename?: unknown;
    label?: unknown;
    notes?: unknown;
    publish?: unknown;
  };

  if (!isValidStorageKey(storageKey)) {
    return NextResponse.json({ error: "Invalid storage key" }, { status: 400 });
  }
  const trimmedLabel = typeof label === "string" ? label.trim() : "";
  if (!trimmedLabel) {
    return NextResponse.json({ error: "Give the version a name" }, { status: 400 });
  }

  const html = await readObject(storageKey);
  if (!html) {
    return NextResponse.json({ error: "Uploaded file not found" }, { status: 400 });
  }

  const inspection = html.length > MAX_DECK_BYTES ? { ok: false as const, error: "File is too large" } : inspectDeckHtml(html);
  if (!inspection.ok) {
    await deleteObject(storageKey);
    return NextResponse.json({ error: inspection.error }, { status: 400 });
  }

  let version;
  try {
    version = await createVersion({
      label: trimmedLabel.slice(0, 200),
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      filename: typeof filename === "string" && filename ? filename.slice(0, 255) : "deck.html",
      storageKey,
      sizeBytes: html.length,
      sha256: createHash("sha256").update(html).digest("hex"),
      warnings: inspection.warnings,
      uploadedBy: email,
    });
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "That upload is already saved as a version" }, { status: 409 });
    }
    throw err;
  }

  if (publish === true) {
    version = (await publishVersion(version.id)) ?? version;
  }

  return NextResponse.json({ version }, { status: 201 });
}
