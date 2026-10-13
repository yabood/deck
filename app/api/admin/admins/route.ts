import { NextResponse } from "next/server";
import { allowedDomain } from "@/auth";
import { addAdmin, currentAdminEmail, envAdmins, removeAdmin } from "@/lib/admins";

export const runtime = "nodejs";

async function readEmail(req: Request): Promise<string | null> {
  const body = await req.json().catch(() => null);
  const email = (body as { email?: unknown } | null)?.email;
  return typeof email === "string" ? email.trim().toLowerCase() : null;
}

export async function POST(req: Request) {
  const me = await currentAdminEmail();
  if (!me) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const email = await readEmail(req);
  if (!email || !/^[^@\s]+@[^@\s]+$/.test(email) || !email.endsWith(`@${allowedDomain}`)) {
    return NextResponse.json({ error: `Enter an @${allowedDomain} email address` }, { status: 400 });
  }

  const admin = await addAdmin(email, me);
  return NextResponse.json({ admin }, { status: 201 });
}

export async function DELETE(req: Request) {
  const me = await currentAdminEmail();
  if (!me) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const email = await readEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }
  if (email === me.toLowerCase()) {
    return NextResponse.json({ error: "You can't remove yourself" }, { status: 400 });
  }
  if (envAdmins().includes(email)) {
    return NextResponse.json({ error: "This admin is set in ADMIN_EMAILS and can only be removed there" }, { status: 400 });
  }

  if (!(await removeAdmin(email))) {
    return NextResponse.json({ error: "Not an admin" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
