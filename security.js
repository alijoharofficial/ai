// Lightweight, best-effort content-protection deterrents for the public
// TECH24 site. These are UX-level speed bumps, not real security controls --
// anyone determined can still view source, use browser dev tools, or read
// network responses. Real protection is server-side (auth, validation,
// least-privilege API keys), which lives in /api and api/_lib.
//
// Deliberately NOT included here:
// - devtools-open detection / blur overlay: too prone to false positives
//   (window resize, docked devtools, browser zoom) and risks locking the
//   site owner out of their own site while debugging.
// - print blocking: admin.html's "Print / Save PDF" invoice feature depends
//   on window.print() working, so this script never interferes with it.
// - watermarking: not needed for a marketing/business site.
// Anti-iframe-embedding is handled via the X-Frame-Options / CSP
// frame-ancestors headers in vercel.json instead of JS frame-busting.
(function () {
  var style = document.createElement('style');
  style.textContent =
    'body{-webkit-user-select:none;-ms-user-select:none;user-select:none;}' +
    'input,textarea,select,[contenteditable]{-webkit-user-select:text;user-select:text;}' +
    'img{-webkit-user-drag:none;user-drag:none;}';
  document.head.appendChild(style);

  var EDITABLE = /^(INPUT|TEXTAREA|SELECT)$/;

  document.addEventListener('contextmenu', function (e) {
    if (EDITABLE.test(e.target.tagName)) return;
    e.preventDefault();
  });

  document.addEventListener('dragstart', function (e) {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });

  document.addEventListener('keydown', function (e) {
    if (EDITABLE.test(e.target.tagName)) return;
    var k = e.key;
    var blocked =
      k === 'F12' ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === 'I' || k === 'J' || k === 'C' || k === 'i' || k === 'j' || k === 'c')) ||
      ((e.ctrlKey || e.metaKey) && (k === 'u' || k === 'U' || k === 's' || k === 'S'));
    if (blocked) e.preventDefault();
  });
})();
