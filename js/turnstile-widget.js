(function () {
    'use strict';
    const container = document.getElementById('swanTurnstile');
    let widgetId = null;
    let token = '';
    if (!container) return;
    window.SwanTurnstile = {
        token: () => token,
        reset: () => { token = ''; if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId); }
    };
    const sitekey = window.__TURNSTILE_SITE_KEY__;
    if (!sitekey) { container.textContent = 'Security verification is unavailable. Please try again later.'; return; }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
        widgetId = window.turnstile.render(container, {
            sitekey,
            callback: value => { token = value; },
            'expired-callback': () => { token = ''; },
            'error-callback': () => { token = ''; }
        });
    };
    script.onerror = () => { container.textContent = 'Security verification is unavailable. Please try again later.'; };
    document.head.appendChild(script);
})();
