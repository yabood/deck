import { NextResponse } from "next/server";
import { currentAdminEmail } from "@/lib/admins";
import { deleteObject } from "@/lib/deck-storage";
import { deleteVersion, getVersion } from "@/lib/deck-versions";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentAdminEmail())) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await getVersion(id);
  if (!existing) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }
  if (existing.is_live) {
    return NextResponse.json({ error: "Make another version live before deleting this one" }, { status: 409 });
  }

  const deleted = await deleteVersion(id);
  if (!deleted) {
    return NextResponse.json({ error: "Version is live or already deleted" }, { status: 409 });
  }

  try {
    await deleteObject(deleted.storage_key);
  } catch (err) {
    // The row is gone either way; an orphaned file is harmless.
    console.error(`Failed to delete stored deck ${deleted.storage_key}`, err);
  }

  return NextResponse.json({ ok: true });
}
