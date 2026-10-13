import { createHash } from "crypto";
import { injectSnippets, streamBuffer } from "@/lib/deck-html";
import { loadVersionHtml } from "@/lib/deck-versions";
import { buildAutoStartScript, buildTabTitleScript, buildVersionResetScript } from "@/lib/rep-scripts";
import { htmlResponse, statusPage } from "@/lib/status-page";
import { buildTrackingScript } from "@/lib/tracking-script";
import type { DeckVersion } from "@/lib/types";

/**
 * Serves a deck version to a signed-in Elastio user, opened straight onto
 * slide one with the tab titled by the current slide. `track` records the session against the version (off for admin
 * previews).
 *
 * The browser keeps the (large) response and revalidates it with an ETag, so
 * a rep re-opening an unchanged deck gets a 304 instead of ~18 MB. The ETag
 * covers the injected scripts too, so it changes with the version, the
 * presenter name, and any change to the scripts themselves.
 */
export async function serveVersion(
  req: Request,
  version: DeckVersion,
  opts: { presenterName: string | null; track: boolean },
): Promise<Response> {
  const headSnippet = buildVersionResetScript(version.id);
  const bodySnippet =
    (opts.track ? buildTrackingScript(version.id) : "") +
    buildTabTitleScript() +
    buildAutoStartScript(opts.presenterName);

  const etag = `"${createHash("sha256")
    .update(version.sha256)
    .update(headSnippet)
    .update(bodySnippet)
    .digest("base64url")}"`;
  const cacheHeaders = { ETag: etag, "Cache-Control": "private, no-cache" };

  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: cacheHeaders });
  }

  const html = await loadVersionHtml(version);
  if (!html) {
    return htmlResponse(
      statusPage("Deck unavailable", "The deck file for this version couldn't be loaded. Let an admin know."),
      500,
    );
  }

  return new Response(streamBuffer(injectSnippets(html, headSnippet, bodySnippet)), {
    headers: { "Content-Type": "text/html; charset=utf-8", ...cacheHeaders },
  });
}
