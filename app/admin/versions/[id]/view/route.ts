import { auth } from "@/auth";
import { isAdmin } from "@/lib/admins";
import { getVersion } from "@/lib/deck-versions";
import { serveVersion } from "@/lib/serve-version";
import { htmlResponse, statusPage } from "@/lib/status-page";

export const runtime = "nodejs";

/** Admin preview of any version, exactly as reps would see it, but not tracked. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!(await isAdmin(session?.user?.email))) {
    return htmlResponse(statusPage("Admins only", "You don't have access to this page."), 403);
  }

  const { id } = await params;
  const version = await getVersion(id);
  if (!version) {
    return htmlResponse(statusPage("Version not found", "This deck version doesn't exist."), 404);
  }

  return serveVersion(req, version, { presenterName: session?.user?.name ?? null, track: false });
}
