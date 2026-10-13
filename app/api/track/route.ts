import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getVersion, isUuid } from "@/lib/deck-versions";
import { recordEvent, isValidEventType } from "@/lib/events";

export const runtime = "nodejs";

function noContent() {
  return new Response(null, { status: 204 });
}

/**
 * Beacons from the tracker injected into the deck (lib/tracking-script.ts).
 * The rep is identified by their session, never by anything in the payload.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return noContent();
  }

  if (typeof body !== "object" || body === null) return noContent();
  const payload = body as Record<string, unknown>;

  const versionId = payload.version_id;
  const sessionId = payload.session_id;
  const eventType = payload.event_type;

  if (!isUuid(versionId) || !isUuid(sessionId) || !isValidEventType(eventType)) {
    return noContent();
  }

  // Never error back to the rep's browser — a signed-out session or a deleted
  // version should just be a silent no-op for tracking.
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return noContent();
  if (!(await getVersion(versionId))) return noContent();

  const slideIndex = typeof payload.slide_index === "number" ? payload.slide_index : null;
  const seconds = typeof payload.seconds === "number" ? payload.seconds : null;

  let geoCountry: string | null = null;
  let geoCity: string | null = null;
  let geoRegion: string | null = null;
  let userAgent: string | null = null;

  if (eventType === "open") {
    geoCountry = req.headers.get("x-vercel-ip-country");
    const rawCity = req.headers.get("x-vercel-ip-city");
    geoCity = rawCity ? decodeURIComponent(rawCity) : null;
    geoRegion = req.headers.get("x-vercel-ip-country-region");
    userAgent = req.headers.get("user-agent");
  }

  await recordEvent({
    versionId,
    viewerEmail: email,
    sessionId,
    eventType,
    slideIndex,
    seconds,
    geoCountry,
    geoCity,
    geoRegion,
    userAgent,
  });

  return noContent();
}
