(function () {
  var script = document.currentScript;
  if (!script || !script.src || window.top !== window.self) return;

  var BARE = 'dash:bare';
  var root = new URL('../../../', script.src);

  function bare() {
    try {
      return sessionStorage.getItem(BARE) === '1';
    } catch (e) {
      return true;
    }
  }

  if (!document.documentElement.hasAttribute('data-shell')) {
    if (bare()) return;
    var to = location.pathname + location.search + location.hash;
    window.__dashRedirect = true;
    location.replace(new URL('shell.html', root).href + '?to=' + encodeURIComponent(to));
    return;
  }

  var frame = document.getElementById('app');
  var lastGood = root.href;

  function target() {
    try {
      var u = new URL(new URLSearchParams(location.search).get('to') || '', location.origin);
      if (u.origin !== location.origin || /\/shell\.html$/.test(u.pathname)) return root.pathname;
      return u.pathname + u.search + u.hash;
    } catch (e) {
      return root.pathname;
    }
  }

  function bailOut() {
    try {
      sessionStorage.setItem(BARE, '1');
    } catch (e) {}
    location.replace(lastGood);
  }

  frame.addEventListener('load', function () {
    var win = frame.contentWindow;
    var href;
    var title;
    try {
      href = win.location.href;
      title = win.document.title;
    } catch (e) {
      bailOut();
      return;
    }
    if (href === 'about:blank') return;
    lastGood = href;
    document.title = title || 'Dash';
    try {
      history.replaceState(null, '', href);
    } catch (e) {}
    try {
      win.focus();
    } catch (e) {}
  });

  function start() {
    frame.src = target();
  }

  import('./audio.js')
    .then(function (m) {
      window.__dashAudio = m.audio;
    })
    .catch(function () {})
    .then(start);
})();