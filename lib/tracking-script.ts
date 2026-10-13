/**
 * Generates the tracking <script> injected into the deck before </body> when
 * a rep opens it at /. It identifies the deck version; the rep's email comes
 * from their session server-side, not from this script. Vanilla JS (no build
 * step) since it runs inside a static deck file, not through Next.js's
 * bundler.
 *
 * Relies on the deck exposing a global `go(n)` as the single chokepoint for
 * slide navigation (keyboard, wheel and menu jumps all call it).
 */
export function buildTrackingScript(versionId: string): string {
  return `<script>
(function(){
  // Remove ourselves so a deck's own "save a copy" feature doesn't carry the tracker along.
  if (document.currentScript) document.currentScript.remove();
  var VERSION_ID = ${JSON.stringify(versionId)};
  var sessionId = (crypto.randomUUID ? crypto.randomUUID() : (Date.now()+'-'+Math.random()));
  var startTime = performance.now();
  var slideStart = startTime;
  var currentSlide = 0;

  function send(payload){
    payload.version_id = VERSION_ID;
    payload.session_id = sessionId;
    try {
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([body], {type: 'application/json'}));
      } else {
        fetch('/api/track', {method: 'POST', body: body, headers: {'Content-Type': 'application/json'}, keepalive: true});
      }
    } catch (e) {}
  }

  function elapsedTotal(){
    return Math.round((performance.now() - startTime) / 1000);
  }

  function flushSlide(){
    var dwell = Math.round((performance.now() - slideStart) / 1000);
    send({event_type: 'slide_view', slide_index: currentSlide, seconds: dwell});
    slideStart = performance.now();
  }

  send({event_type: 'open'});

  if (typeof window.go === 'function') {
    var origGo = window.go;
    window.go = function(n){
      flushSlide();
      origGo(n);
      currentSlide = (typeof window.i === 'number') ? window.i : n;
    };
  }

  setInterval(function(){
    if (document.visibilityState === 'visible') {
      send({event_type: 'heartbeat', slide_index: currentSlide, seconds: elapsedTotal()});
    }
  }, 15000);

  addEventListener('pagehide', function(){
    flushSlide();
    send({event_type: 'close', slide_index: currentSlide, seconds: elapsedTotal()});
  });
})();
</script>`;
}
