/* ===== Vectorized Points Network =====
 * Random scattered points drifting on random trajectories. Lines link the
 * nearest points to each other and to the cursor (constellation / net effect).
 * Line opacity fades with distance. Fixed to the viewport.
 */
(() => {
    'use strict';

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'particle-waves';
    document.body.insertBefore(canvas, document.body.firstChild);
    const ctx = canvas.getContext('2d');

    // Warm palette dots (match site theme)
    const PALETTE = ['#C58940', '#FAEAB1', '#E5BA73', '#A27035'];
    const LINE_RGB = '197, 137, 64';   // --accent

    // Tunables
    const DENSITY = 13000;       // 1 point per N px^2 of viewport
    const MAX_POINTS = 120;
    const LINK_DIST = 135;       // px to link two points
    const MOUSE_DIST = 190;      // px to link a point to the cursor
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

        const count = Math.min(Math.round((width * height) / DENSITY), MAX_POINTS);
        points = new Array(count);
        for (let i = 0; i < count; i++) {
            const ang = rand(0, Math.PI * 2);
            const sp = rand(0.4, 1) * SPEED;
            points[i] = {
                x: rand(0, width),
                y: rand(0, height),
                vx: Math.cos(ang) * sp,
                vy: Math.sin(ang) * sp,
                r: rand(2, 4.5),
                color: PALETTE[(Math.random() * PALETTE.length) | 0]
            };
        }
    }

    window.addEventListener('pointermove', (e) => {
        mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
    }, { passive: true });
    window.addEventListener('pointerleave', () => { mouse.active = false; });
    window.addEventListener('touchend', () => { mouse.active = false; }, { passive: true });

    let resizeRAF = null;
    window.addEventListener('resize', () => {
        if (resizeRAF) cancelAnimationFrame(resizeRAF);
        resizeRAF = requestAnimationFrame(build);
    });

    function frame() {
        ctx.clearRect(0, 0, width, height);

        // Move + bounce off edges
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;
        }

        // Links between nearest points
        ctx.lineWidth = 1;
        for (let i = 0; i < points.length; i++) {
            const a = points[i];
            for (let j = i + 1; j < points.length; j++) {
                const b = points[j];
                const dx = a.x - b.x, dy = a.y - b.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < LINK_DIST * LINK_DIST) {
                    const alpha = (1 - Math.sqrt(d2) / LINK_DIST) * 0.5;
                    ctx.strokeStyle = `rgba(${LINE_RGB}, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }

            // Link to cursor
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

        // Dots on top
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            ctx.beginPath();
            ctx.fillStyle = p.color;
            ctx.arc(p.x, p.y, p.r, 0, 6.2832);
            ctx.fill();
        }

        requestAnimationFrame(frame);
    }

    build();
    requestAnimationFrame(frame);
})();
