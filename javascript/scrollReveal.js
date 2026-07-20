document.addEventListener('DOMContentLoaded', function () {
  var revealElements = document.querySelectorAll('.reveal');

  function revealAll() {
    revealElements.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  // No IntersectionObserver -> just show everything.
  if (!('IntersectionObserver' in window)) {
    revealAll();
    return;
  }

  var ioFired = false;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        ioFired = true;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(function (el) {
    observer.observe(el);
  });

  // Fail-safe: on some iOS Safari builds the observer never fires for
  // elements already in the viewport at load, leaving the page blank.
  // If nothing has intersected after a moment, reveal everything.
  setTimeout(function () {
    if (!ioFired) revealAll();
  }, 1200);
});
