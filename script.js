/**
 * Focus Shift — minimal landing page scripts
 */
(function () {
  var primary = document.getElementById("testflight-primary");
  if (primary && primary.hostname === "testflight.apple.com" && primary.pathname === "/") {
    // Placeholder URL — replace href in index.html with your real TestFlight link
    console.info("[Focus Shift] Set your TestFlight invite URL on the primary button in index.html.");
  }
})();
