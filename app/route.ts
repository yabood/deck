import { auth } from "@/auth";
import { getLiveVersion } from "@/lib/deck-versions";
import { serveVersion } from "@/lib/serve-version";
import { htmlResponse, statusPage } from "@/lib/status-page";

export const runtime = "nodejs";

/** deck.elastio.com: the live sales deck, for any signed-in Elastio user. */
export async function GET(req: Request) {
  // proxy.ts already sends signed-out visitors to /login; this is the backstop.
  const session = await auth();
  if (!session?.user?.email) {
    return Response.redirect(new URL("/login", req.url));
  }

  const version = await getLiveVersion();
  if (!version) {
    return htmlResponse(
      statusPage("No deck published yet", "There's no live sales deck yet. Check back soon, or ask an admin."),
      503,
    );
  }

  return serveVersion(req, version, { presenterName: session.user.name ?? null, track: true });
}
