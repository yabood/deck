import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { currentAdminEmail } from "@/lib/admins";
import { MAX_DECK_BYTES, isValidStorageKey, usesBlobStorage } from "@/lib/deck-storage";

export const runtime = "nodejs";

/**
 * Hands the admin's browser a short-lived client token to upload a deck
 * straight into the private Blob store (decks are too big to pass through a
 * function). Registering the upload as a version is a separate call to
 * /api/admin/versions, so no upload-completed webhook is involved.
 */
export async function POST(request: Request) {
  if (!usesBlobStorage()) {
    return NextResponse.json({ error: "Blob storage isn't configured" }, { status: 400 });
  }
  if (!(await currentAdminEmail())) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!isValidStorageKey(pathname)) throw new Error("Invalid upload path");
        return {
          allowedContentTypes: ["text/html"],
          maximumSizeInBytes: MAX_DECK_BYTES,
          validUntil: Date.now() + 15 * 60 * 1000,
        };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Blob upload token request failed", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
