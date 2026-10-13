import { NextResponse } from "next/server";
import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { currentAdminEmail } from "@/lib/admins";
import { MAX_DECK_BYTES, isValidStorageKey, usesBlobStorage } from "@/lib/deck-storage";

export const runtime = "nodejs";

/**
 * Hands the admin's browser a short-lived presigned URL to PUT a deck straight
 * into the private Blob store (decks are too big to pass through a function).
 * Registering the upload as a version is a separate call to /api/admin/versions.
 */
export async function POST(request: Request) {
  if (!usesBlobStorage()) {
    return NextResponse.json({ error: "Blob storage isn't configured" }, { status: 400 });
  }
  if (!(await currentAdminEmail())) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as HandleUploadPresignedBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const result = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname) => {
        if (!isValidStorageKey(pathname)) throw new Error("Invalid upload path");
        const constraints = { allowedContentTypes: ["text/html"], maximumSizeInBytes: MAX_DECK_BYTES };
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          validUntil: Date.now() + 15 * 60 * 1000,
          ...constraints,
        });
        return { token, urlOptions: constraints };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
