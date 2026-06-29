/* ===== Vectorized Points Network =====
 * Random scattered points drifting on random trajectories. Lines link the
 * nearest points to each other and to the cursor (constellation / net effect).
 * Line opacity fades with distance. Fixed to the viewport.
 *
 * Accessibility: when prefers-reduced-motion is set we DON'T bail out (that
 * left those visitors with no background at all). Instead we render a single
 * static frame and only redraw on cursor move / resize — visible for everyone,
 * just not continuously animated.
 */
(() => {
    'use strict';

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const canvas = document.createElement('canvas');
    canvas.id = 'particle-waves';
    document.body.insertBefore(canvas, document.body.firstChild);
    const ctx = canvas.getContext('2d');

    // Warm palette dots (match site theme)
    const PALETTE = ['#C58940', '#FAEAB1', '#E5BA73', '#A27035'];
    const LINE_RGB = '197, 137, 64';   // --accent

    // Tunables
    const DENSITY = 9000;        // 1 point per N px^2 of viewport (lower = denser)
    const MAX_POINTS = 140;
    const MIN_POINTS = 14;       // floor so small screens still show a network
    const LINK_DIST = 150;       // px to link two points
    const MOUSE_DIST = 200;      // px to link a point to the cursor
    const SPEED = 0.35;          // base drift speed (px/frame)

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0, height = 0;
    let points = [];

    const mouse = { x: -9999, y: -9999, active: false };

    function rand(min, max) { return min + Math.random() * (max - min); }

    function build() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        let count = Math.round((width * height) / DENSITY);
        count = Math.max(MIN_POINTS, Math.min(count, MAX_POINTS));
        points = new Array(count);
        for (let i = 0; i < count; i++) {
            const ang = rand(0, Math.PI * 2);
            const sp = rand(0.4, 1) * SPEED;
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

    function step() {
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;
        }
    }

    function render() {
        ctx.clearRect(0, 0, width, height);
        ctx.lineWidth = 1;

        for (let i = 0; i < points.length; i++) {
            const a = points[i];
            for (let j = i + 1; j < points.length; j++) {
                const b = points[j];
                const dx = a.x - b.x, dy = a.y - b.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < LINK_DIST * LINK_DIST) {
                    const alpha = (1 - Math.sqrt(d2) / LINK_DIST) * 0.55;
                    ctx.strokeStyle = `rgba(${LINE_RGB}, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }

            if (mouse.active) {
                const dx = a.x - mouse.x, dy = a.y - mouse.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < MOUSE_DIST * MOUSE_DIST) {
                    const alpha = (1 - Math.sqrt(d2) / MOUSE_DIST) * 0.7;
                    ctx.strokeStyle = `rgba(${LINE_RGB}, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                }
            }
        }

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            ctx.beginPath();
            ctx.fillStyle = p.color;
            ctx.arc(p.x, p.y, p.r, 0, 6.2832);
            ctx.fill();
        }
    }

    function animate() {
        step();
        render();
        requestAnimationFrame(animate);
    }

    // Reduced motion: redraw only on interaction, no continuous loop
    let staticRAF = null;
    function renderOnce() {
        if (staticRAF) return;
        staticRAF = requestAnimationFrame(() => { staticRAF = null; render(); });
    }

    window.addEventListener('pointermove', (e) => {
        mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
        if (reduced) renderOnce();
    }, { passive: true });
    window.addEventListener('pointerleave', () => {
        mouse.active = false;
        if (reduced) renderOnce();
    });
    window.addEventListener('touchend', () => { mouse.active = false; }, { passive: true });

    let resizeRAF = null;
    window.addEventListener('resize', () => {
        if (resizeRAF) cancelAnimationFrame(resizeRAF);
        resizeRAF = requestAnimationFrame(() => { build(); if (reduced) render(); });
    });

    build();
    if (reduced) render();
    else requestAnimationFrame(animate);
})();
