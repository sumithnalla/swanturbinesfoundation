function canonicalIp(value: string): string | null {
  if (/^[0-9.]+$/.test(value)) {
    const parts=value.split('.');
    if (parts.length !== 4 || parts.some(p=>!/^\d{1,3}$/.test(p) || Number(p)>255 || (p.length>1 && p.startsWith('0')))) return null;
    return parts.join('.');
  }
  if (!/^[0-9a-f:]+$/i.test(value) || !value.includes(':')) return null;
  try { return new URL(`http://[${value}]/`).hostname.slice(1,-1).toLowerCase(); } catch (_) { return null; }
}

/** The caller must supply an ingress-verified IP, never an arbitrary forwarded header. */
export async function saltedIpHash(trustedClientIp: string, salt: string): Promise<string> {
  const ip = canonicalIp(trustedClientIp);
  if (!ip || salt.length < 32) throw new Error('Trusted client IP or rate-limit salt unavailable');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(salt), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('');
}

export async function consumeRateLimit(db: {rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{data: unknown,error: unknown}>}, endpoint: 'help'|'contact'|'upload', trustedIp: string, salt: string, limit: number): Promise<boolean> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 10000) throw new Error('Invalid rate limit');
  const hash = await saltedIpHash(trustedIp, salt);
  const {data,error} = await db.rpc('take_public_request_rate_limit', {p_endpoint:endpoint,p_ip_hash:hash,p_limit:limit});
  if (error || typeof data !== 'boolean') throw new Error('Rate limit service unavailable');
  return data;
}
