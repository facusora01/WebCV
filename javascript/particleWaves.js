/* ===== Vectorized Points Network =====
 * Random scattered points drifting on random trajectories. Lines link the
 * nearest points to each other and to the cursor (constellation / net effect).
 * Line opacity fades with distance. Fixed to the viewport.
 *
 * iOS note: showing/hiding the Safari address bar on scroll fires `resize`
 * with a changed innerHeight. We must NOT regenerate the points there (that
 * made them jump to new random spots on every scroll). `fit()` only resizes
 * the canvas and keeps the existing points; points are re-created only once.
 */
(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var canvas = document.createElement('canvas');
    canvas.id = 'particle-waves';
    document.body.insertBefore(canvas, document.body.firstChild);
    var ctx = canvas.getContext('2d');

    var PALETTE = ['#C58940', '#FAEAB1', '#E5BA73', '#A27035'];
    var LINE_RGB = '197, 137, 64';

    var DENSITY = 9000;
    var MAX_POINTS = 140;
    var MIN_POINTS = 14;
    var LINK_DIST = 150;
    var MOUSE_DIST = 200;
    var SPEED = 0.35;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = 0, height = 0;
    var points = [];

    var mouse = { x: -9999, y: -9999, active: false };

    function rand(min, max) { return min + Math.random() * (max - min); }

    // Resize the canvas to the viewport. Scale existing point X positions only
    // when the WIDTH changes (orientation / real resize); a height-only change
    // (iOS URL bar) leaves points untouched — no reset, no jitter.
    function fit() {
        var newW = window.innerWidth;
        var newH = window.innerHeight;
        var widthChanged = width !== 0 && newW !== width;

        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(newW * dpr);
        canvas.height = Math.floor(newH * dpr);
        canvas.style.width = newW + 'px';
        canvas.style.height = newH + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (widthChanged && points.length) {
            var sx = newW / width;
            for (var i = 0; i < points.length; i++) points[i].x *= sx;
        }

        width = newW;
        height = newH;
    }

    function initPoints() {
        var count = Math.round((width * height) / DENSITY);
        count = Math.max(MIN_POINTS, Math.min(count, MAX_POINTS));
        points = new Array(count);
        for (var i = 0; i < count; i++) {
            var ang = rand(0, Math.PI * 2);
            var sp = rand(0.4, 1) * SPEED;
            points[i] = {
                x: rand(0, width),
                y: rand(0, height),
                vx: Math.cos(ang) * sp,
                vy: Math.sin(ang) * sp,
                r: rand(2.5, 5),
                color: PALETTE[(Math.random() * PALETTE.length) | 0]
            };
        }
    }

    // Pointer / touch: drive the cursor link, clear it when the finger lifts.
    //
    // Mobile is the tricky part. Once the browser decides the gesture is a
    // scroll it takes the touch over: it fires `touchcancel` / `pointercancel`
    // and (on several engines) stops delivering `touchmove` to the page, so a
    // naive handler drops the link the moment the user starts scrolling.
    // Two paths keep it alive:
    //   1. `touchmove` still arrives  -> track the finger directly.
    //   2. the touch was cancelled    -> keep the link and move it with the
    //      scroll offset, since the finger travels with the page. It is
    //      released when the scrolling stops or leaves the viewport.
    var scrollLinked = false;  // touch taken over by the scroll, following it
    var anchorY = 0, anchorScroll = 0;
    var scrollIdle = null;

    function setMouse(x, y) { mouse.x = x; mouse.y = y; mouse.active = true; dirty(); }
    function release() {
        scrollLinked = false;
        mouse.active = false;
        if (scrollIdle) { clearTimeout(scrollIdle); scrollIdle = null; }
        dirty();
    }

    // With reduced motion there is no animation loop, so the canvas has to be
    // repainted explicitly for the cursor link to react at all.
    var renderRAF = null;
    function dirty() {
        if (!reduced || renderRAF) return;
        renderRAF = requestAnimationFrame(function () { renderRAF = null; render(); });
    }

    function setTouch(e) {
        var t = e.touches && e.touches[0];
        if (!t) return;
        scrollLinked = false;
        if (scrollIdle) { clearTimeout(scrollIdle); scrollIdle = null; }
        setMouse(t.clientX, t.clientY);
    }

    function endTouch(e) {
        if (e.touches && e.touches.length) { setTouch(e); return; }
        release();
    }

    // Scroll takeover: hand the link over to the scroll tracker instead of
    // dropping it.
    function cancelTouch(e) {
        if (e.touches && e.touches.length) { setTouch(e); return; }
        if (!mouse.active) return;
        scrollLinked = true;
        anchorY = mouse.y;
        anchorScroll = window.pageYOffset;
        armScrollIdle();
    }

    function armScrollIdle() {
        if (scrollIdle) clearTimeout(scrollIdle);
        scrollIdle = setTimeout(release, 350);
    }

    window.addEventListener('scroll', function () {
        if (!scrollLinked) return;
        setMouse(mouse.x, anchorY - (window.pageYOffset - anchorScroll));
        if (mouse.y < -MOUSE_DIST || mouse.y > height + MOUSE_DIST) { release(); return; }
        armScrollIdle();
    }, { passive: true });

    // Mouse / pen only — touch is handled entirely by the touch events above.
    function pointerIsTouch(e) { return e.pointerType === 'touch'; }
    window.addEventListener('pointermove', function (e) {
        if (pointerIsTouch(e)) return;
        setMouse(e.clientX, e.clientY);
    }, { passive: true });
    function pointerEnd(e) { if (!pointerIsTouch(e)) release(); }
    window.addEventListener('pointerup', pointerEnd, { passive: true });
    window.addEventListener('pointercancel', pointerEnd, { passive: true });
    window.addEventListener('pointerleave', pointerEnd, { passive: true });

    window.addEventListener('touchstart', setTouch, { passive: true });
    window.addEventListener('touchmove', setTouch, { passive: true });
    window.addEventListener('touchend', endTouch, { passive: true });
    window.addEventListener('touchcancel', cancelTouch, { passive: true });

    var resizeRAF = null;
    window.addEventListener('resize', function () {
        if (resizeRAF) cancelAnimationFrame(resizeRAF);
        resizeRAF = requestAnimationFrame(fit);
    });

    function step() {
        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;
        }
    }

    function render() {
        ctx.clearRect(0, 0, width, height);
        ctx.lineWidth = 1;

        for (var i = 0; i < points.length; i++) {
            var a = points[i];
            for (var j = i + 1; j < points.length; j++) {
                var b = points[j];
                var dx = a.x - b.x, dy = a.y - b.y;
                var d2 = dx * dx + dy * dy;
                if (d2 < LINK_DIST * LINK_DIST) {
                    var alpha = (1 - Math.sqrt(d2) / LINK_DIST) * 0.55;
                    ctx.strokeStyle = 'rgba(' + LINE_RGB + ', ' + alpha + ')';
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }

            if (mouse.active) {
                var mdx = a.x - mouse.x, mdy = a.y - mouse.y;
                var md2 = mdx * mdx + mdy * mdy;
                if (md2 < MOUSE_DIST * MOUSE_DIST) {
                    var ma = (1 - Math.sqrt(md2) / MOUSE_DIST) * 0.7;
                    ctx.strokeStyle = 'rgba(' + LINE_RGB + ', ' + ma + ')';
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                }
            }
        }

        for (var k = 0; k < points.length; k++) {
            var p2 = points[k];
            ctx.beginPath();
            ctx.fillStyle = p2.color;
            ctx.arc(p2.x, p2.y, p2.r, 0, 6.2832);
            ctx.fill();
        }
    }

    function animate() {
        step();
        render();
        requestAnimationFrame(animate);
    }

    fit();
    initPoints();
    if (reduced) render();
    else requestAnimationFrame(animate);
})();
