import { NextResponse } from "next/server";
import { currentAdminEmail } from "@/lib/admins";
import { publishVersion } from "@/lib/deck-versions";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentAdminEmail())) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { id } = await params;
  const version = await publishVersion(id);
  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  return NextResponse.json({ version });
}
