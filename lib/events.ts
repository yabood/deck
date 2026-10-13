import { sql } from "@/lib/db";
import type { ViewEventType } from "@/lib/types";

const VALID_EVENT_TYPES: ViewEventType[] = ["open", "slide_view", "heartbeat", "close"];

export function isValidEventType(value: unknown): value is ViewEventType {
  return typeof value === "string" && VALID_EVENT_TYPES.includes(value as ViewEventType);
}

export async function recordEvent(params: {
  versionId: string;
  viewerEmail: string;
  sessionId: string;
  eventType: ViewEventType;
  slideIndex: number | null;
  seconds: number | null;
  geoCountry: string | null;
  geoCity: string | null;
  geoRegion: string | null;
  userAgent: string | null;
}): Promise<void> {
  await sql`
    insert into deck_view_events
      (version_id, viewer_email, session_id, event_type, slide_index, seconds, geo_country, geo_city, geo_region, user_agent)
    values
      (${params.versionId}, ${params.viewerEmail}, ${params.sessionId}, ${params.eventType}, ${params.slideIndex},
       ${params.seconds}, ${params.geoCountry}, ${params.geoCity}, ${params.geoRegion}, ${params.userAgent})
  `;
}
