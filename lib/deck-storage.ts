import { randomUUID } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { del, get } from "@vercel/blob";

/**
 * Where uploaded deck HTML lives. On Vercel that's a private Blob store
 * (connecting the store to the project sets BLOB_READ_WRITE_TOKEN, which
 * browser uploads need to mint client tokens); in local dev without it, the
 * gitignored .data/ folder.
 *
 * Decks are too big (~18 MB) to go through a Vercel Function request body
 * (4.5 MB cap), so in Blob mode the browser uploads straight to Blob — see
 * app/api/admin/versions/blob-upload. Local mode just POSTs the file to
 * app/api/admin/versions/local-upload.
 */
export function usesBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export const MAX_DECK_BYTES = 100 * 1024 * 1024;

const KEY_PATTERN = /^deck-versions\/[A-Za-z0-9-]+\.html$/;

export function isValidStorageKey(key: unknown): key is string {
  return typeof key === "string" && KEY_PATTERN.test(key);
}

export function newStorageKey(): string {
  return `deck-versions/${randomUUID()}.html`;
}

const LOCAL_ROOT = path.join(process.cwd(), ".data");

function localPath(key: string): string {
  if (!isValidStorageKey(key)) throw new Error(`Invalid storage key: ${key}`);
  return path.join(LOCAL_ROOT, key);
}

export async function writeLocalObject(key: string, data: Uint8Array): Promise<void> {
  if (process.env.VERCEL) {
    throw new Error("Local deck storage isn't available on Vercel. Connect a Blob store to this project.");
  }
  const file = localPath(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
}

export async function readObject(key: string): Promise<Buffer | null> {
  if (usesBlobStorage()) {
    const result = await get(key, { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }
  try {
    return await readFile(localPath(key));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function deleteObject(key: string): Promise<void> {
  if (usesBlobStorage()) {
    await del(key);
  } else {
    await rm(localPath(key), { force: true });
  }
}
