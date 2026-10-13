import { NextResponse } from "next/server";
import { currentAdminEmail } from "@/lib/admins";
import { MAX_DECK_BYTES, newStorageKey, usesBlobStorage, writeLocalObject } from "@/lib/deck-storage";

export const runtime = "nodejs";

/** Local dev only (no Blob credentials): the raw deck HTML is the request body. */
export async function POST(req: Request) {
  if (usesBlobStorage() || process.env.VERCEL) {
    return NextResponse.json({ error: "Local uploads are only for local development" }, { status: 400 });
  }
  if (!(await currentAdminEmail())) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const data = new Uint8Array(await req.arrayBuffer());
  if (data.length === 0 || data.length > MAX_DECK_BYTES) {
    return NextResponse.json({ error: "File is empty or too large" }, { status: 400 });
  }

  const storageKey = newStorageKey();
  await writeLocalObject(storageKey, data);
  return NextResponse.json({ storageKey }, { status: 201 });
}
