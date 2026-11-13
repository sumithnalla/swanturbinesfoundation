// X-Forwarded-For is best-effort only: callers/proxies may influence it.
// Supabase documents its availability for API request context:
// https://supabase.com/docs/guides/api/securing-your-api
export async function checkPublicRateLimit(req:Request,endpoint:'help'|'contact'|'upload',
  config:{salt:string|undefined;globalLimit:number;ipLimit:number},
  rpc:(args:Record<string,unknown>)=>PromiseLike<{data:unknown;error:unknown}>):Promise<'allowed'|'limited'|'unavailable'> {
  if(!config.salt||config.salt.length<32||config.salt.length>512)return 'unavailable';
  const ip=(req.headers.get('x-forwarded-for')||'').split(',')[0].trim();
  let hash:string|null=null;
  if(ip.length>=2&&ip.length<=45&&/^[0-9a-f:.]+$/i.test(ip)){
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(config.salt),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ip.toLowerCase()));
    hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  }
  try {
    const {data,error}=await rpc({p_endpoint:endpoint,p_hash:hash,p_global_limit:config.globalLimit,p_ip_limit:config.ipLimit});
    if(error||typeof data!=='boolean')return 'unavailable';
    return data?'allowed':'limited';
  }catch(_){return 'unavailable';}
}
