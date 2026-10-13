import { sql } from "@/lib/db";
import { readObject } from "@/lib/deck-storage";
import type { DeckVersion } from "@/lib/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export async function listVersions(): Promise<DeckVersion[]> {
  const rows = await sql`select * from deck_versions order by created_at desc`;
  return rows as unknown as DeckVersion[];
}

export async function getVersion(id: string): Promise<DeckVersion | null> {
  if (!isUuid(id)) return null;
  const rows = await sql`select * from deck_versions where id = ${id}`;
  return (rows[0] as DeckVersion) ?? null;
}

export async function getLiveVersion(): Promise<DeckVersion | null> {
  const rows = await sql`select * from deck_versions where is_live`;
  return (rows[0] as DeckVersion) ?? null;
}

export async function createVersion(params: {
  label: string;
  notes: string | null;
  filename: string;
  storageKey: string;
  sizeBytes: number;
  sha256: string;
  warnings: string[];
  uploadedBy: string;
}): Promise<DeckVersion> {
  const rows = await sql`
    insert into deck_versions (label, notes, filename, storage_key, size_bytes, sha256, warnings, uploaded_by)
    values (${params.label}, ${params.notes}, ${params.filename}, ${params.storageKey}, ${params.sizeBytes},
            ${params.sha256}, ${params.warnings}, ${params.uploadedBy})
    returning *
  `;
  return rows[0] as DeckVersion;
}

/** Makes this version the one reps see at /. Also how you roll back. */
export async function publishVersion(id: string): Promise<DeckVersion | null> {
  if (!isUuid(id)) return null;
  return sql.begin(async (tx) => {
    const target = await tx`select id from deck_versions where id = ${id} for update`;
    if (target.length === 0) return null;
    await tx`update deck_versions set is_live = false where is_live and id <> ${id}`;
    const rows = await tx`
      update deck_versions set is_live = true, published_at = now()
      where id = ${id}
      returning *
    `;
    return rows[0] as DeckVersion;
  });
}

/** Deletes a version that isn't live. Returns the deleted row so the caller can remove its stored HTML. */
export async function deleteVersion(id: string): Promise<DeckVersion | null> {
  if (!isUuid(id)) return null;
  const rows = await sql`delete from deck_versions where id = ${id} and not is_live returning *`;
  return (rows[0] as DeckVersion) ?? null;
}

// Versions are immutable, so each instance can keep the HTML of the last
// couple it served (in practice: the live one) instead of re-reading ~18 MB
// from storage per request.
const htmlCache = new Map<string, Buffer>();
const HTML_CACHE_ENTRIES = 2;

export async function loadVersionHtml(version: DeckVersion): Promise<Buffer | null> {
  const cached = htmlCache.get(version.id);
  if (cached) return cached;

  const html = await readObject(version.storage_key);
  if (!html) return null;

  htmlCache.set(version.id, html);
  while (htmlCache.size > HTML_CACHE_ENTRIES) {
    htmlCache.delete(htmlCache.keys().next().value!);
  }
  return html;
}
