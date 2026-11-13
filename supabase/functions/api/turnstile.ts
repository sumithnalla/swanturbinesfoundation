type Verification = { ok: boolean; unavailable: boolean };

// Keep this check independent of the browser: Turnstile tokens are single-use.
export async function verifyTurnstile(token: unknown, secret: string | undefined,
    allowedHostnames: string[], fetcher: typeof fetch = fetch): Promise<Verification> {
  if (!secret || allowedHostnames.length === 0) return { ok: false, unavailable: true };
  if (typeof token !== 'string' || token.length < 1 || token.length > 2048) return { ok: false, unavailable: false };
  try {
    const result = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token }), signal: AbortSignal.timeout(5000),
    });
    if (!result.ok) return { ok: false, unavailable: true };
    const body = await result.json();
    return { ok: body.success === true && typeof body.hostname === 'string' && allowedHostnames.includes(body.hostname.toLowerCase()), unavailable: false };
  } catch (_) { return { ok: false, unavailable: true }; }
}
