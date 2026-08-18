// Kapoori Ka — external service-worker registration with an update flow.
// When a new version is ready and an old one is controlling, activate it and
// reload once so the user gets the new release without clearing browser data.
(function () {
  if (!('serviceWorker' in navigator)) return;

  var refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(function (reg) {
        reg.addEventListener('updatefound', function () {
          var newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', function () {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage('SKIP_WAITING');
            }
          });
        });
      })
      .catch(function (err) {
        console.warn('[SW] registration failed:', err);
      });
  });
})();
