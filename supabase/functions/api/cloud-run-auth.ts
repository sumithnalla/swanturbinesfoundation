/** Keyless Google Cloud Run invocation. Never log the supplied assertion or tokens. */
export interface FederationConfig {
  providerAudience: string;
  serviceAccountEmail: string;
  cloudRunAudience: string;
}

export function validateFederationConfig(config: FederationConfig): URL {
  if (!/^\/\/iam\.googleapis\.com\/projects\/[0-9]+\/locations\/global\/workloadIdentityPools\/[a-z0-9-]+\/providers\/[a-z0-9-]+$/.test(config.providerAudience)) throw new Error('Invalid workload identity provider');
  if (!/^[a-z0-9][a-z0-9-]{4,28}[a-z0-9]@[a-z0-9-]+\.iam\.gserviceaccount\.com$/.test(config.serviceAccountEmail)) throw new Error('Invalid service account');
  const url = new URL(config.cloudRunAudience);
  if (url.protocol !== 'https:' || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.run\.app$/.test(url.hostname) || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid Cloud Run audience');
  return url;
}

/** Exchanges a short-lived OIDC assertion for the invoker service account's Google ID token. */
export async function googleIdToken(assertion: string, config: FederationConfig, fetcher: typeof fetch = fetch): Promise<string> {
  validateFederationConfig(config);
  if (!assertion || assertion.length > 32768) throw new Error('Missing workload identity assertion');
  const sts = await fetcher('https://sts.googleapis.com/v1/token', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audience: config.providerAudience, grantType: 'urn:ietf:params:oauth:grant-type:token-exchange', requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token', scope: 'https://www.googleapis.com/auth/cloud-platform', subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt', subjectToken: assertion }),
  });
  if (!sts.ok) throw new Error('Workload identity exchange failed');
  const accessToken = (await sts.json()).access_token;
  if (typeof accessToken !== 'string' || !accessToken) throw new Error('Workload identity exchange returned no token');
  const identity = await fetcher(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(config.serviceAccountEmail)}:generateIdToken`, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ audience: config.cloudRunAudience, includeEmail: true }),
  });
  if (!identity.ok) throw new Error('Cloud Run identity token request failed');
  const idToken = (await identity.json()).token;
  if (typeof idToken !== 'string' || !idToken) throw new Error('Cloud Run identity token missing');
  return idToken;
}

export async function requestRebuild(raw: Uint8Array, mime: string, config: FederationConfig, idToken: string, fetcher: typeof fetch = fetch): Promise<Uint8Array> {
  const url = validateFederationConfig(config);
  if (!idToken || raw.byteLength === 0 || raw.byteLength > 10 * 1024 * 1024 || !['application/pdf','image/jpeg','image/png','image/webp'].includes(mime)) throw new Error('Invalid converter request');
  url.pathname = '/rebuild';
  const response = await fetcher(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(55000), headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': mime }, body: Uint8Array.from(raw).buffer });
  if (!response.ok || response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== mime) throw new Error('Document rebuild failed');
  const declaredLength = Number(response.headers.get('Content-Length'));
  if (declaredLength > 30 * 1024 * 1024) throw new Error('Rebuilt document is too large');
  if (!response.body) throw new Error('Invalid rebuilt document');
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 30 * 1024 * 1024) { await reader.cancel(); throw new Error('Rebuilt document is too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (!length) throw new Error('Invalid rebuilt document');
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  const starts=(...prefix: number[])=>prefix.every((byte,index)=>body[index]===byte);
  const valid = mime === 'application/pdf' ? starts(0x25,0x50,0x44,0x46,0x2d)
    : mime === 'image/jpeg' ? starts(0xff,0xd8,0xff)
    : mime === 'image/png' ? starts(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a)
    : starts(0x52,0x49,0x46,0x46) && String.fromCharCode(...body.slice(8,12)) === 'WEBP';
  if (!valid) throw new Error('Invalid rebuilt document');
  return body;
}
