/* =========================================================
   SWAN TURBINES FOUNDATION - CIRCULAR PROFILE TEXT
========================================================= */

(function () {
    function initCircularText() {
        document.querySelectorAll('.circular-text[data-text]').forEach(container => {
            if (container.dataset.circularTextInitialized === 'true') return;

            const text = container.dataset.text.trim();
            if (!text) return;

            container.dataset.circularTextInitialized = 'true';
            container.innerHTML = Array.from(text).map((letter, index) => {
                const displayLetter = letter === ' ' ? '&nbsp;' : letter;
                const angle = (360 / text.length) * index;
                return `<span style="--angle:${angle}deg">${displayLetter}</span>`;
            }).join('');
        });
    }

    document.addEventListener('DOMContentLoaded', initCircularText);
    window.initCircularText = initCircularText;
})();
