/* =========================================================
   SWAN TURBINES FOUNDATION - REACT BITS TEXT LOOP WAVE ENGINE
========================================================= */

(function () {
    const VIEW_W = 1200;
    const VIEW_H = 320;
    const CX = VIEW_W / 2;
    const CY = VIEW_H / 2;
    const EDGE_PAD = 6;

    function buildPath(shape, curviness, ribbonWidth) {
        const c = Math.max(0, curviness);
        const room = Math.max(20, CY - Math.max(0, ribbonWidth) / 2 - EDGE_PAD);

        switch (shape) {
            case 'circle': {
                const r = Math.min(90 + c * 0.95, room);
                return `M ${CX - r} ${CY} A ${r} ${r} 0 1 1 ${CX + r} ${CY} A ${r} ${r} 0 1 1 ${CX - r} ${CY} Z`;
            }
            case 'infinity': {
                const r = 150 + c * 1.4;
                const h = Math.min(60 + c * 0.95, room);
                return [
                    `M ${CX} ${CY}`,
                    `C ${CX + r * 0.55} ${CY - h} ${CX + r} ${CY - h} ${CX + r} ${CY}`,
                    `C ${CX + r} ${CY + h} ${CX + r * 0.55} ${CY + h} ${CX} ${CY}`,
                    `C ${CX - r * 0.55} ${CY - h} ${CX - r} ${CY - h} ${CX - r} ${CY}`,
                    `C ${CX - r} ${CY + h} ${CX - r * 0.55} ${CY + h} ${CX} ${CY}`,
                    'Z'
                ].join(' ');
            }
            case 'arch': {
                const rise = Math.min(120 + c * 1.1, room * 2);
                return `M 120 ${CY + rise / 2} Q ${CX} ${CY - rise * 1.5} ${VIEW_W - 120} ${CY + rise / 2}`;
            }
            case 'line':
                return `M -320 ${CY} L ${VIEW_W + 320} ${CY}`;
            case 'wave':
            default: {
                const a = Math.min(c * 2.2, room * 2);
                return `M -320 ${CY} Q -160 ${CY - a} 0 ${CY} T 320 ${CY} T 640 ${CY} T 960 ${CY} T 1280 ${CY} T ${VIEW_W + 320} ${CY}`;
            }
        }
    }

    function initTextLoop() {
        const containers = document.querySelectorAll('.text-loop-container');
        containers.forEach(container => {
            if (container.dataset.textLoopInitialized === 'true') return;
            if (container.dataset.disableMobile === 'true' && window.matchMedia('(max-width: 640px)').matches) {
                container.dataset.textLoopInitialized = 'mobile-disabled';
                return;
            }
            container.dataset.textLoopInitialized = 'true';

            const rawText = container.dataset.text || "SWAN TURBINES FOUNDATION";
            const shape = container.dataset.shape || 'wave';
            const speed = Number(container.dataset.speed) || 35; // Slow & smooth
            const direction = container.dataset.direction || 'forward';
            const separator = container.dataset.separator || '✦';
            const curviness = Number(container.dataset.curviness) || 75;
            const fontSize = Number(container.dataset.fontSize) || 32;
            const fontWeight = container.dataset.fontWeight || '800';
            const letterSpacing = Number(container.dataset.letterSpacing) || 2;
            const uppercase = container.dataset.uppercase !== 'false';
            const textColor = container.dataset.color || '#0a3663';
            const ribbon = container.dataset.ribbon !== 'false';
            const ribbonColor = container.dataset.ribbonColor || '#ffffff';
            const ribbonWidth = Number(container.dataset.ribbonWidth) || 64;

            const d = buildPath(shape, curviness, ribbonWidth);

            const base = uppercase ? String(rawText).toUpperCase() : String(rawText);
            const gap = separator ? `\u00A0${separator}\u00A0` : '\u00A0\u00A0\u00A0';
            const unit = `${base}${gap}`;

            const rawId = Math.random().toString(36).substring(2, 7);
            const pathId = `text-loop-path-${rawId}`;

            container.innerHTML = `
                <div class="text-loop">
                    <svg class="text-loop-svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${base}">
                        <path id="${pathId}" class="loop-path-el" d="${d}" fill="none"
                            stroke="${ribbon ? ribbonColor : 'none'}"
                            stroke-width="${ribbon ? ribbonWidth : 0}"
                            stroke-linecap="round" stroke-linejoin="round" />

                        <text class="text-loop-measure" style="font-size:${fontSize}px;font-weight:${fontWeight};letter-spacing:${letterSpacing + 2}px;" aria-hidden="true">${unit}</text>

                        <text class="text-loop-text" style="font-size:${fontSize}px;font-weight:${fontWeight};letter-spacing:${letterSpacing + 2}px;" fill="${textColor}" dominant-baseline="central" aria-hidden="true">
                            <textPath class="head-path" href="#${pathId}" startOffset="0">${unit}</textPath>
                        </text>

                        <text class="text-loop-text" style="font-size:${fontSize}px;font-weight:${fontWeight};letter-spacing:${letterSpacing + 2}px;" fill="${textColor}" dominant-baseline="central" aria-hidden="true">
                            <textPath class="tail-path" href="#${pathId}" startOffset="0">${unit}</textPath>
                        </text>
                    </svg>
                </div>
            `;

            const pathEl = container.querySelector('.loop-path-el');
            const measureEl = container.querySelector('.text-loop-measure');
            const headPath = container.querySelector('.head-path');
            const tailPath = container.querySelector('.tail-path');
            const rootEl = container.querySelector('.text-loop');

            setTimeout(() => {
                let length = 0;
                let unitWidth = 0;
                try {
                    length = pathEl.getTotalLength();
                    unitWidth = measureEl.getComputedTextLength();
                } catch (e) {
                    length = 1800;
                    unitWidth = 400;
                }

                if (!length) length = 1800;
                const reps = unitWidth > 0 ? Math.max(1, Math.round(length / unitWidth) + 1) : 4;
                const loopText = unit.repeat(reps);

                headPath.textContent = loopText;
                tailPath.textContent = loopText;

                headPath.setAttribute('textLength', String(length));
                headPath.setAttribute('lengthAdjust', 'spacing');
                tailPath.setAttribute('textLength', String(length));
                tailPath.setAttribute('lengthAdjust', 'spacing');

                function apply(offset) {
                    const partner = offset >= 0 ? offset - length : offset + length;
                    headPath.setAttribute('startOffset', String(offset));
                    tailPath.setAttribute('startOffset', String(partner));
                }

                apply(0);

                let isPaused = false;
                let isVisible = false;
                if (rootEl) {
                    rootEl.addEventListener('pointerenter', () => isPaused = true);
                    rootEl.addEventListener('pointerleave', () => isPaused = false);
                }

                if ('IntersectionObserver' in window) {
                    const observer = new IntersectionObserver(([entry]) => {
                        isVisible = entry.isIntersecting;
                    }, { threshold: 0.1 });
                    observer.observe(container);
                } else {
                    isVisible = true;
                }

                let currentOffset = 0;
                let lastTimestamp = performance.now();

                function step(now) {
                    const dt = (now - lastTimestamp) / 1000;
                    lastTimestamp = now;

                    if (isVisible && !isPaused && speed > 0) {
                        const dirMult = direction === 'reverse' ? -1 : 1;
                        currentOffset += speed * dt * dirMult;

                        if (direction === 'forward' && currentOffset >= length) {
                            currentOffset -= length;
                        } else if (direction === 'reverse' && currentOffset <= -length) {
                            currentOffset += length;
                        }
                        apply(currentOffset);
                    }

                    requestAnimationFrame(step);
                }

                requestAnimationFrame(step);
            }, 50);
        });
    }

    document.addEventListener('DOMContentLoaded', initTextLoop);
    window.initTextLoop = initTextLoop;
})();
