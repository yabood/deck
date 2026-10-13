import { auth } from "@/auth";
import { sql } from "@/lib/db";
import type { Admin } from "@/lib/types";

/**
 * Admins listed in the ADMIN_EMAILS env var (comma-separated). These always
 * have access and can't be removed from the UI, so there's no way to lock
 * everyone out of /admin.
 */
export function envAdmins(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function isAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const normalized = email.toLowerCase();
  if (envAdmins().includes(normalized)) return true;
  const rows = await sql`select 1 from admins where email = ${normalized}`;
  return rows.length > 0;
}

/**
 * For admin API routes: the signed-in admin's email, or null if the caller
 * isn't signed in or isn't an admin. Proxy only gates /admin pages, so every
 * /api/admin route must call this itself.
 */
export async function currentAdminEmail(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email ?? null;
  return (await isAdmin(email)) ? email : null;
}

export async function listAdmins(): Promise<Admin[]> {
  const rows = await sql`select * from admins order by created_at`;
  return rows as unknown as Admin[];
}

export async function addAdmin(email: string, addedBy: string): Promise<Admin> {
  const rows = await sql`
    insert into admins (email, added_by)
    values (${email.toLowerCase()}, ${addedBy})
    on conflict (email) do update set email = excluded.email
    returning *
  `;
  return rows[0] as Admin;
}

export async function removeAdmin(email: string): Promise<boolean> {
  const rows = await sql`delete from admins where email = ${email.toLowerCase()} returning email`;
  return rows.length > 0;
}
