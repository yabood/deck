/**
 * Buffer-level helpers for serving uploaded deck HTML. Decks are ~18 MB
 * (mostly inline base64 images), so we work on bytes rather than decoding to
 * a string, and stream the result: Vercel caps buffered function responses at
 * 4.5 MB, but streamed responses aren't limited.
 */

const STREAM_CHUNK_BYTES = 1024 * 1024;

/** Position just after the opening `<head ...>` tag, or -1 if there isn't one. */
function afterHeadOpen(html: Buffer): number {
  let from = 0;
  while (true) {
    const idx = html.indexOf("<head", from);
    if (idx === -1) return -1;
    const next = html[idx + 5];
    // `<head>` or `<head attr...>`, but not `<header>`
    if (next === 0x3e /* > */ || next === 0x20 || next === 0x09 || next === 0x0a || next === 0x0d) {
      const close = html.indexOf(">", idx);
      return close === -1 ? -1 : close + 1;
    }
    from = idx + 5;
  }
}

/**
 * Inserts `headSnippet` right after `<head>` (so it runs before any of the
 * deck's own scripts) and `bodySnippet` before the last `</body>` (so it runs
 * after them). Falls back to appending both at the end if the markers are
 * missing — browsers still execute scripts there.
 */
export function injectSnippets(html: Buffer, headSnippet: string, bodySnippet: string): Buffer {
  const headAt = headSnippet ? afterHeadOpen(html) : -1;
  const bodyAt = html.lastIndexOf("</body>");

  if (headAt === -1) {
    const tail = headSnippet + bodySnippet;
    if (bodyAt === -1) return Buffer.concat([html, Buffer.from(tail)]);
    return Buffer.concat([html.subarray(0, bodyAt), Buffer.from(tail), html.subarray(bodyAt)]);
  }

  if (bodyAt === -1 || bodyAt < headAt) {
    return Buffer.concat([
      html.subarray(0, headAt),
      Buffer.from(headSnippet),
      html.subarray(headAt),
      Buffer.from(bodySnippet),
    ]);
  }

  return Buffer.concat([
    html.subarray(0, headAt),
    Buffer.from(headSnippet),
    html.subarray(headAt, bodyAt),
    Buffer.from(bodySnippet),
    html.subarray(bodyAt),
  ]);
}

export function streamBuffer(data: Buffer): ReadableStream<Uint8Array> {
  let offset = 0;
  return new ReadableStream({
    pull(controller) {
      if (offset >= data.length) {
        controller.close();
        return;
      }
      const end = Math.min(offset + STREAM_CHUNK_BYTES, data.length);
      controller.enqueue(new Uint8Array(data.buffer, data.byteOffset + offset, end - offset));
      offset = end;
    },
  });
}

export type DeckInspection = { ok: true; warnings: string[] } | { ok: false; error: string };

/**
 * Sanity checks run when a version is uploaded. Only "is this HTML at all" is
 * fatal; the rest are hooks the portal relies on, reported as warnings.
 */
export function inspectDeckHtml(html: Buffer): DeckInspection {
  const head = html.subarray(0, 4096).toString("utf-8").toLowerCase();
  if (!head.includes("<html") && !head.includes("<!doctype html")) {
    return { ok: false, error: "That file doesn't look like an HTML deck." };
  }

  const warnings: string[] = [];
  if (html.indexOf("function go(") === -1) {
    warnings.push("No global go() navigation function found, so per-slide analytics won't be recorded.");
  }
  if (html.indexOf('id="startBtn"') === -1) {
    warnings.push("No #startBtn found, so the deck can't auto-start on slide one. Reps will land on its first screen.");
  }
  return { ok: true, warnings };
}
