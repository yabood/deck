/**
 * Scripts injected when a rep opens the live deck at / (and when an admin
 * previews a version). Like the tracker, they're vanilla JS and remove their
 * own <script> tag so a deck's "save a copy" feature doesn't carry them along.
 */

/** JSON that's safe to drop inside a <script> element. */
function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

// Deck localStorage entries keyed by slide index (title edits, custom slide
// order). Carried over to a new version they'd apply to the wrong slides, so
// they're cleared whenever the version changes. Display prefs (theme, text
// size, TOC) are kept.
const PER_VERSION_KEY_PREFIXES = ["elastio.deck.text", "elastio.deck.flow"];

/** Goes right after <head>, so it runs before the deck reads its saved state. */
export function buildVersionResetScript(versionId: string): string {
  return `<script>
(function(){
  if (document.currentScript) document.currentScript.remove();
  try {
    var KEY = 'elastio.portal.version', version = ${scriptJson(versionId)};
    if (localStorage.getItem(KEY) === version) return;
    var prefixes = ${scriptJson(PER_VERSION_KEY_PREFIXES)};
    for (var i = localStorage.length - 1; i >= 0; i--) {
      var k = localStorage.key(i);
      if (k && prefixes.some(function(p){ return k.indexOf(p) === 0; })) localStorage.removeItem(k);
    }
    localStorage.setItem(KEY, version);
  } catch (e) {}
})();
</script>`;
}

/**
 * Goes before </body>. Titles the browser tab with the current slide's
 * heading (also what the audience sees in a screen-share tab picker). Slides
 * without a heading, like the cover, fall back to the deck's own <title>.
 */
export function buildTabTitleScript(): string {
  return `<script>
(function(){
  if (document.currentScript) document.currentScript.remove();
  var deckTitle = document.title;
  function sync(){
    var heading = document.querySelector('.slide.show .title');
    var text = heading ? heading.textContent.replace(/\\s+/g, ' ').trim() : '';
    document.title = text || deckTitle;
  }
  if (typeof window.go === 'function') {
    var go = window.go;
    window.go = function(){
      var result = go.apply(this, arguments);
      sync();
      return result;
    };
  }
})();
</script>`;
}

/**
 * Goes before </body>. Skips the deck's setup screen so it opens on slide
 * one, with the presenter field filled from the rep's Google profile. Esc
 * still returns to the setup screen to add a customer name/logo or switch
 * audience.
 */
export function buildAutoStartScript(presenterName: string | null): string {
  return `<script>
(function(){
  if (document.currentScript) document.currentScript.remove();
  var name = ${scriptJson(presenterName ?? "")};
  function start(){
    var pres = document.getElementById('iPres');
    if (pres && name && !pres.value) pres.value = name;
    var btn = document.getElementById('startBtn');
    if (btn) btn.click();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
</script>`;
}
