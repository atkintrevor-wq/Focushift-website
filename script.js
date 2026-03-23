/** Focus Shift — landing page (year in footer) */
(function () {
  var y = document.getElementById("y");
  if (y) y.textContent = String(new Date().getFullYear());
})();
