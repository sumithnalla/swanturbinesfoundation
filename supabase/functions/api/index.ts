// Phase 3 API compatibility function. Secrets remain server-side only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import { productionForms, requestLookup } from "./production-forms.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const authClient = () => createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
const origins = (Deno.env.get("ALLOWED_ORIGINS") || "http://localhost:3000,http://localhost:5500,http://127.0.0.1:3000,http://127.0.0.1:5500")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
const cors = (req: Request) => {
  const origin = req.headers.get("origin");
  return {
    ...(origin && origins.includes(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-upload-token",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Vary": "Origin",
  };
};
const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" } });
const fail = (req: Request, status: number, code: string, message: string) => json(req, { error: { code, message } }, status);
const asNum = (v: string | null, d: number, max: number) => Math.min(Math.max(Number(v || d) || d, 1), max);
const basePath = (u: URL) => { const p = u.pathname; const i = p.indexOf("/api/v1"); return i >= 0 ? p.slice(i) : p; };

async function actor(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  return data.user || null;
}
async function permitted(req: Request, permission: string) {
  const user = await actor(req); if (!user) return null;
  const { data: profile } = await db.from("profiles").select("id,email,full_name,is_active").eq("id", user.id).maybeSingle();
  if (!profile?.is_active) return null;
  const { data: links } = await db.from("user_roles").select("role_id").eq("user_id", user.id);
  const ids = (links || []).map((x: any) => x.role_id); if (!ids.length) return null;
  const { data: links2 } = await db.from("role_permissions").select("permission_id").in("role_id", ids);
  const pids = (links2 || []).map((x: any) => x.permission_id); if (!pids.length) return null;
  const { data: perms } = await db.from("permissions").select("name").in("id", pids);
  const names = new Set((perms || []).map((x: any) => x.name)); const resource = permission.split(".")[0];
  return names.has("*") || names.has(permission) || names.has(`${resource}.*`) || names.has(`${resource}.manage`) ? profile : null;
}
async function audit(profile: any, action: string, resourceType?: string, resourceId?: string | null, result = "success", metadata?: any) {
  const entry = { actor_id: profile?.id || null, actor_email: profile?.email || null, action, resource_type: resourceType || null, resource_id: resourceId || null, result, metadata: metadata || null };
  let { error } = await db.from("audit_logs").insert(entry);
  if (error) ({ error } = await db.from("audit_logs").insert(entry));
  if (error) console.error("Audit record could not be persisted after retry", { action, code: error.code });
}
const COMPANY_ADMIN_SENDER = "aruna@swanturbinesfoundation.com";

async function email(to: string, subject: string, html: string, attachments: Array<{ filename: string; content: string }> = [], text?: string) {
  const key = Deno.env.get("RESEND_API_KEY"), from = COMPANY_ADMIN_SENDER;
  if (!key || !from) return false;
  const payload: Record<string, unknown> = { from, to: [to], subject, html };
  if (text) payload.text = text;
  if (attachments.length) payload.attachments = attachments;
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  return r.ok;
}
function campaignOut(c: any) { return c; }
function requestOut(r: any) { return { id:r.id, reference:r.reference, status:r.status, support_type:r.support_type, urgency:r.urgency, applicant:{ full_name:r.applicant_full_name,mobile:r.applicant_mobile,email:r.applicant_email,address:r.applicant_address,city:r.applicant_city,state:r.applicant_state }, request:{ support_type:r.support_type,description:r.description,beneficiaries:r.beneficiaries,amount_required:r.amount_required,urgency:r.urgency }, admin_note:r.admin_note,created_at:r.created_at,updated_at:r.updated_at }; }
function support(v: string) { const m:any={"food or essential supplies":"food","medical care & surgeries":"medical","education & schooling":"education","shelter & housing repair":"housing","water & community sanitation":"community_development","disaster & emergency relief":"emergency"}; v=(m[v?.toLowerCase()]||v||"other").toLowerCase(); return ["medical","education","food","housing","emergency","community_development","other"].includes(v)?v:"other"; }
function urgency(v: string) { const m:any={low:"normal",medium:"normal",high:"urgent",critical:"emergency"}; v=m[(v||"").toLowerCase()]||v||"normal"; return ["normal","urgent","emergency"].includes(v)?v:"normal"; }
const driveFolderMime = "application/vnd.google-apps.folder";
const allowedDocumentTypes = new Set(["application/pdf","image/jpeg","image/png","image/webp"]);
const documentType = (value: FormDataEntryValue | null) => ["identity","medical","income","quote","supporting","other"].includes(String(value)) ? String(value) : "supporting";
const hex = async (bytes: ArrayBuffer) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map((x) => x.toString(16).padStart(2,"0")).join("");
const tokenValue = () => Array.from(crypto.getRandomValues(new Uint8Array(32))).map((x) => x.toString(16).padStart(2,"0")).join("");
const cleanName = (name: string) => name.replace(/[\\/:*?"<>|\u0000-\u001f]/g,"_").slice(0,180) || "document";
function base64Url(bytes: Uint8Array | string) { const raw = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes; let binary=""; for (const byte of raw) binary+=String.fromCharCode(byte); return btoa(binary).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_"); }
function base64Std(bytes: Uint8Array) { return Buffer.from(bytes).toString("base64"); }
function pemBytes(pem: string) { const text=pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,""); const binary=atob(text); return Uint8Array.from(binary,(x)=>x.charCodeAt(0)); }
async function driveAccessToken() { const raw=Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON"); if(!raw) throw new Error("Google Drive service account is not configured."); const account=JSON.parse(raw), now=Math.floor(Date.now()/1000), head=base64Url(JSON.stringify({alg:"RS256",typ:"JWT"})), claim=base64Url(JSON.stringify({iss:account.client_email,scope:"https://www.googleapis.com/auth/drive",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3300})); const key=await crypto.subtle.importKey("pkcs8",pemBytes(account.private_key),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]); const signature=new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(`${head}.${claim}`))); const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:`${head}.${claim}.${base64Url(signature)}`})}); if(!response.ok) throw new Error(`Google token request failed (${response.status}).`); return (await response.json()).access_token as string; }
async function driveFetch(token: string, path: string, init: RequestInit = {}) { const response=await fetch(`https://www.googleapis.com/drive/v3/${path}`,{...init,headers:{Authorization:`Bearer ${token}`,...init.headers}}); if(!response.ok) throw new Error(`Google Drive request failed (${response.status}).`); return response; }
async function driveFolder(token: string, name: string, parent: string) { const response=await driveFetch(token,"files?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:cleanName(name),mimeType:driveFolderMime,parents:[parent]})}); return (await response.json()).id as string; }
async function driveUpload(token: string, parent: string, file: File) { const boundary=`swan-${crypto.randomUUID()}`, metadata=JSON.stringify({name:cleanName(file.name),parents:[parent]}), body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`,await file.arrayBuffer(),`\r\n--${boundary}--`]); const response=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":`multipart/related; boundary=${boundary}`},body}); if(!response.ok) throw new Error(`Google Drive upload failed (${response.status}).`); return await response.json(); }
async function deleteDriveFile(token: string, id: string) { try { await driveFetch(token,`files/${encodeURIComponent(id)}`,{method:"DELETE"}); } catch (_) {} }
async function driveDownload(token: string, id: string) { return fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`,{headers:{Authorization:`Bearer ${token}`}}); }
async function appsScriptSignature(timestamp: string, body: string, secret: string) { const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]); return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(`${timestamp}.${body}`)))).map((x)=>x.toString(16).padStart(2,"0")).join(""); }
async function appsScriptCall(operation: string, payload: Record<string, unknown>) { const endpoint=Deno.env.get("GOOGLE_APPS_SCRIPT_URL"),secret=Deno.env.get("GOOGLE_APPS_SCRIPT_SHARED_SECRET"); if(!endpoint||!secret) throw new Error("Google Apps Script is not configured."); const body=JSON.stringify({operation,...payload}),timestamp=Math.floor(Date.now()/1000).toString(),signature=await appsScriptSignature(timestamp,body,secret),response=await fetch(`${endpoint}?timestamp=${timestamp}&signature=${signature}`,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body}); if(!response.ok) throw new Error(`Apps Script request failed (${response.status}).`); const result=await response.json(); if(result.error) throw new Error(String(result.error)); return result; }
const storageDocumentPrefix = "supabase-storage:";
const requestDocumentBucket = "request-documents";
async function downloadStoredRequestDocument(path: string) { const { data,error }=await db.storage.from(requestDocumentBucket).download(path); if(error||!data)throw error||new Error("Stored document not found."); return data; }
function fileSignatureIsValid(file: File, bytes: Uint8Array) { const starts=(...values:number[])=>values.every((v,i)=>bytes[i]===v), ext=file.name.toLowerCase().split(".").pop(); if(file.type==="application/pdf") return starts(0x25,0x50,0x44,0x46,0x2d); if(file.type==="image/jpeg") return starts(0xff,0xd8,0xff); if(file.type==="image/png") return starts(0x89,0x50,0x4e,0x47); if(file.type==="image/gif") return starts(0x47,0x49,0x46,0x38); if(file.type==="image/webp") return starts(0x52,0x49,0x46,0x46) && String.fromCharCode(...bytes.slice(8,12))==="WEBP"; if(["docx","xlsx"].includes(ext||"")) return starts(0x50,0x4b,0x03,0x04); if(["doc","xls"].includes(ext||"")) return starts(0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1); return false; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    const u = new URL(req.url), path = basePath(u), method = req.method;
    const handled = await productionForms(req,path,{db,json,fail,permitted,audit,hex,tokenValue,support,urgency,email,requestOut,fileSignatureIsValid,base64Std});
    if(handled) return handled;
    if (path === "/health" || path === "/api/health") return json(req, { status:"ok", version:"3.0.0", environment:Deno.env.get("DENO_DEPLOYMENT_ID") ? "production" : "development", database:"ok" });
    if(Deno.env.get("GOOGLE_APPS_SCRIPT_URL")&&method==="GET"){const m=path.match(/^\/api\/v1\/requests\/admin\/([^/]+)\/documents\/check-folder$/);if(m){const p=await permitted(req,"documents.manage");if(!p)return fail(req,403,"FORBIDDEN","Insufficient permission.");const {data:request}=await db.from("help_requests").select("id,reference").eq(requestLookup(m[1]),m[1]).maybeSingle();if(!request)return fail(req,404,"NOT_FOUND","Help request not found.");try{return json(req,await appsScriptCall("check",{reference:request.reference}));}catch(_){return fail(req,503,"DOCUMENT_STORAGE_UNAVAILABLE","Folder cleanup verification is temporarily unavailable.");}}}
    if(Deno.env.get("GOOGLE_APPS_SCRIPT_URL")&&method==="DELETE"){const m=path.match(/^\/api\/v1\/requests\/admin\/([^/]+)\/documents\/([^/]+)$/);if(m){const p=await permitted(req,"documents.manage");if(!p)return fail(req,403,"FORBIDDEN","Insufficient permission.");const {data:request}=await db.from("help_requests").select("id,reference").eq(requestLookup(m[1]),m[1]).maybeSingle();if(!request)return fail(req,404,"NOT_FOUND","Help request not found.");const {data:doc}=await db.from("request_documents").select("id,google_drive_file_id").eq("id",m[2]).eq("request_id",request.id).maybeSingle();if(!doc)return fail(req,404,"NOT_FOUND","Document not found.");try{await appsScriptCall("delete",{reference:request.reference,file_id:doc.google_drive_file_id});const {error}=await db.from("request_documents").delete().eq("id",doc.id);if(error)throw error;await audit(p,"request.document_deleted","help_request",request.id,"success",{document_id:doc.id,storage:"apps_script"});return new Response(null,{status:204,headers:cors(req)});}catch(_){return fail(req,503,"DOCUMENT_STORAGE_UNAVAILABLE","Document deletion is temporarily unavailable.");}}}
    if(method==="GET"){const m=path.match(/^\/api\/v1\/requests\/admin\/([^/]+)\/documents\/([^/]+)\/download$/);if(m){const p=await permitted(req,"requests.view_documents");if(!p)return fail(req,403,"FORBIDDEN","Insufficient permission.");const {data:request}=await db.from("help_requests").select("id,reference").eq(requestLookup(m[1]),m[1]).maybeSingle();if(!request)return fail(req,404,"NOT_FOUND","Help request not found.");const {data:doc}=await db.from("request_documents").select("id,google_drive_file_id,original_filename,mime_type").eq("id",m[2]).eq("request_id",request.id).maybeSingle();if(!doc||!doc.google_drive_file_id)return fail(req,404,"NOT_FOUND","Document not found.");const headers=new Headers({...cors(req),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"});headers.set("Content-Type",doc.mime_type||"application/octet-stream");headers.set("Content-Disposition",`attachment; filename*=UTF-8''${encodeURIComponent(doc.original_filename)}`);try{if(doc.google_drive_file_id.startsWith(storageDocumentPrefix)){const blob=await downloadStoredRequestDocument(doc.google_drive_file_id.slice(storageDocumentPrefix.length));return new Response(blob,{status:200,headers});}if(Deno.env.get("GOOGLE_APPS_SCRIPT_URL")){const result=await appsScriptCall("download",{reference:request.reference,file_id:doc.google_drive_file_id}),bytes=Buffer.from(result.content_base64,"base64");return new Response(bytes,{status:200,headers});}const token=await driveAccessToken(),response=await driveDownload(token,doc.google_drive_file_id);if(!response.ok)return fail(req,503,"DOCUMENT_STORAGE_UNAVAILABLE","Document download is temporarily unavailable.");return new Response(await response.arrayBuffer(),{status:200,headers});}catch(_){return fail(req,503,"DOCUMENT_STORAGE_UNAVAILABLE","Document download is temporarily unavailable.");}}}
    if (path === "/api/v1/auth/login" && method === "POST") { const b=await req.json(); const email=typeof b.email==="string"?b.email.trim().toLowerCase():""; const {data,error}=await authClient().auth.signInWithPassword({email,password:b.password}); if(error||!data.user||!data.session){const safeEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&email.length<=254?email:null;await audit(safeEmail?{email:safeEmail}:null,"login.failure","user",null,"failure",{method:"password",reason:"invalid_credentials"});return fail(req,401,"UNAUTHORIZED","Invalid email or password.");} const {data:profile}=await db.from("profiles").select("id,full_name,email,is_active,created_at,updated_at").eq("id",data.user.id).maybeSingle(); const {data:roles}=await db.from("user_roles").select("role_id").eq("user_id",data.user.id); const roleIds=(roles||[]).map((x:any)=>x.role_id); const {data:roleRows}=roleIds.length?await db.from("roles").select("id,name").in("id",roleIds):{data:[]}; if(!profile?.is_active||!roleIds.length){await audit(profile||{email},"login.failure","user",profile?.id||null,"failure",{method:"password",reason:!profile?.is_active?"inactive_account":"no_role"});return fail(req,403,!profile?.is_active?"ACCOUNT_INACTIVE":"FORBIDDEN",!profile?.is_active?"This staff account is inactive. Contact an administrator.":"This staff account has no assigned role.");} await audit(profile,"login.success","user",profile.id); return json(req,{user:{...profile,role_ids:roleIds,role_names:(roleRows||[]).map((x:any)=>x.name)},access_token:data.session.access_token,refresh_token:data.session.refresh_token}); }
    if (path === "/api/v1/auth/refresh" && method === "POST") { const b=await req.json(); if(!b.refresh_token)return fail(req,401,"UNAUTHORIZED","A refresh token is required."); const {data,error}=await authClient().auth.refreshSession({refresh_token:String(b.refresh_token)}); if(error||!data.session||!data.user)return fail(req,401,"UNAUTHORIZED","The staff session has expired. Please sign in again."); const {data:profile}=await db.from("profiles").select("id,is_active").eq("id",data.user.id).maybeSingle(); if(!profile?.is_active)return fail(req,403,"ACCOUNT_INACTIVE","This staff account is inactive. Please sign in again."); return json(req,{access_token:data.session.access_token,refresh_token:data.session.refresh_token}); }
    if (path === "/api/v1/auth/me" && method === "GET") { const user=await actor(req); if(!user) return fail(req,401,"UNAUTHORIZED","Authentication required."); const {data}=await db.from("profiles").select("id,full_name,email,is_active,created_at,updated_at").eq("id",user.id).maybeSingle(); if(!data?.is_active)return fail(req,403,"ACCOUNT_INACTIVE","This staff account is inactive. Please sign in again."); const {data: roles}=await db.from("user_roles").select("role_id").eq("user_id",user.id); const roleIds=(roles||[]).map((x:any)=>x.role_id); const {data:roleRows}=roleIds.length?await db.from("roles").select("id,name").in("id",roleIds):{data:[]}; return json(req,{...data,role_ids:roleIds,role_names:(roleRows||[]).map((x:any)=>x.name)}); }
    if (path === "/api/v1/auth/logout" && method === "POST") return json(req,{message:"Logged out successfully."});

    if (path === "/api/v1/campaigns" && method === "GET") { const page=asNum(u.searchParams.get("page"),1,10000), size=asNum(u.searchParams.get("page_size")||u.searchParams.get("limit"),12,50); const {data,count,error}=await db.from("campaigns").select("*",{count:"exact"}).eq("status","active").order("display_order").range((page-1)*size,page*size-1); if(error) throw error; return json(req,{campaigns:(data||[]).map(campaignOut),total:count||0,page,page_size:size}); }
    if (path === "/api/v1/campaigns/featured" && method === "GET") { const limit=asNum(u.searchParams.get("limit"),3,10); const {data,error}=await db.from("campaigns").select("*").eq("status","active").eq("featured",true).order("display_order").limit(limit); if(error) throw error; return json(req,data||[]); }
    if (path.startsWith("/api/v1/campaigns/") && method === "GET" && !path.startsWith("/api/v1/campaigns/admin")) { const slug=decodeURIComponent(path.split("/").pop()!); const {data}=await db.from("campaigns").select("*").eq("slug",slug).neq("status","draft").maybeSingle(); return data?json(req,data):fail(req,404,"NOT_FOUND","Campaign not found."); }
    if (path === "/api/v1/campaigns/admin/all" && method === "GET") { if(!await permitted(req,"campaigns.read")) return fail(req,403,"FORBIDDEN","Insufficient permission."); const page=asNum(u.searchParams.get("page"),1,10000),size=asNum(u.searchParams.get("page_size"),20,100),status=u.searchParams.get("status"); let q:any=db.from("campaigns").select("*",{count:"exact"}).order("created_at",{ascending:false}); if(status)q=q.eq("status",status); const {data,count,error}=await q.range((page-1)*size,page*size-1);if(error)throw error;return json(req,{campaigns:data||[],total:count||0,page,page_size:size}); }
    if (path === "/api/v1/campaigns" && method === "POST") { const p=await permitted(req,"campaigns.manage");if(!p)return fail(req,403,"FORBIDDEN","Insufficient permission.");const b=await req.json();const {data,error}=await db.from("campaigns").insert(b).select().single();if(error)return fail(req,400,"VALIDATION_ERROR",error.message);await audit(p,"campaign.created","campaign",data.id,"success",{slug:data.slug});return json(req,data,201); }
    const campaignId=path.match(/^\/api\/v1\/campaigns\/([\w-]+)(?:\/status)?$/)?.[1]; if(campaignId && ["PUT","DELETE","PATCH"].includes(method)) { const p=await permitted(req,"campaigns.manage");if(!p)return fail(req,403,"FORBIDDEN","Insufficient permission."); if(method==="DELETE"){const {error}=await db.from("campaigns").delete().eq("id",campaignId);if(error)throw error;await audit(p,"campaign.deleted","campaign",campaignId);return new Response(null,{status:204,headers:cors(req)});} const payload=method==="PATCH"?{status:u.searchParams.get("status")} : await req.json(); const {data,error}=await db.from("campaigns").update(payload).eq("id",campaignId).select().single();if(error)return fail(req,400,"VALIDATION_ERROR",error.message);await audit(p,method==="PATCH"?"campaign.status_changed":"campaign.updated","campaign",campaignId);return json(req,method==="PATCH"?{message:`Campaign status updated to '${data.status}'.`}:data); }


    if(path.match(/^\/api\/v1\/requests\/track\//)&&method==="GET"){const reference=decodeURIComponent(path.split("/").pop()!);const {data}=await db.from("help_requests").select("reference,status,support_type,urgency,created_at,updated_at").eq("reference",reference).maybeSingle();return data?json(req,data):fail(req,404,"NOT_FOUND","Help request not found.");}
    const applicantDocuments=path.match(/^\/api\/v1\/requests\/([^/]+)\/documents$/);
    if(applicantDocuments&&method==="POST"){
      const uploadToken=req.headers.get("x-request-upload-token");
      if(!uploadToken)return fail(req,401,"UNAUTHORIZED","Document upload authorization is required.");
      const {data:request}=await db.from("help_requests").select("id,reference,google_drive_folder_id,document_upload_token_hash,document_upload_token_expires_at").eq("id",applicantDocuments[1]).maybeSingle();
      if(!request||!request.document_upload_token_hash||!request.document_upload_token_expires_at||new Date(request.document_upload_token_expires_at)<=new Date()||request.document_upload_token_hash!==await hex(new TextEncoder().encode(uploadToken).buffer))return fail(req,401,"UNAUTHORIZED","Document upload authorization is invalid or expired.");
      if(Number(req.headers.get("content-length"))>32*1024*1024)return fail(req,413,"VALIDATION_ERROR","Upload body is too large.");
      const form=await req.formData(),files=form.getAll("files").filter((x):x is File=>x instanceof File);
      if(!files.length||files.length>3)return fail(req,422,"VALIDATION_ERROR","Upload one to three supported documents (three maximum per application).");
      if(files.some((file)=>file.size===0||file.size>10485760||!allowedDocumentTypes.has(file.type)||!(({ "application/pdf":/\.pdf$/i,"image/jpeg":/\.jpe?g$/i,"image/png":/\.png$/i,"image/webp":/\.webp$/i } as Record<string,RegExp>)[file.type]?.test(file.name))))return fail(req,422,"VALIDATION_ERROR","Each file must be an allowed type and no larger than 10 MB.");
      const previews=await Promise.all(files.map(async(file)=>({file,bytes:new Uint8Array((await file.slice(0,16).arrayBuffer()))})));
      if(previews.some(({file,bytes})=>!fileSignatureIsValid(file,bytes)))return fail(req,422,"VALIDATION_ERROR","One or more files failed format validation.");
      const lock=crypto.randomUUID();
      const acquired=await db.rpc("acquire_document_upload",{p_request:request.id,p_lock:lock});
      if(acquired.error)throw acquired.error;
      if(!acquired.data)return fail(req,409,"UPLOAD_BUSY","An upload is already in progress. Wait before retrying.");
      try{
        const existing=await db.from("request_documents").select("google_drive_file_id,original_filename,sha256,size_bytes").eq("request_id",request.id).neq("storage_status","deleted");
        if(existing.error)throw existing.error;
        const known=existing.data||[];
        const uploads: {file: File,digest: string}[]=[];
        const uploaded: {id: string,name: string,size_bytes: number}[]=[];
        for(const {file} of previews){
          const digest=await hex(await file.arrayBuffer());
          const previous=known.find((doc:any)=>doc.sha256===digest&&doc.original_filename===cleanName(file.name));
          if(previous)uploaded.push({id:previous.google_drive_file_id,name:previous.original_filename,size_bytes:previous.size_bytes});
          else if(!uploads.some((doc:any)=>doc.digest===digest&&doc.file.name===file.name)) uploads.push({file,digest});
          else return fail(req,422,"VALIDATION_ERROR","Do not select the same file twice.");
        }
        if(known.length+uploads.length>3)return fail(req,422,"DOCUMENT_LIMIT","An application may contain at most three documents.");
        let folderId=request.google_drive_folder_id;
        let driveToken:string|null=null;
        if(!Deno.env.get("GOOGLE_APPS_SCRIPT_URL")){
          driveToken=await driveAccessToken();
          if(!folderId){
            const parent=Deno.env.get("GOOGLE_DRIVE_CHARITY_REQUESTS_FOLDER_ID");
            if(!parent)throw new Error("Google Drive folder is not configured.");
            folderId=await driveFolder(driveToken,request.reference,parent);
          }
        }
        for(const {file,digest} of uploads){
          let driveFile:any;
          let fileBytes:ArrayBuffer|undefined;
          if(Deno.env.get("GOOGLE_APPS_SCRIPT_URL")){
            fileBytes=await file.arrayBuffer();
            const bytes=new Uint8Array(fileBytes);
            driveFile=await appsScriptCall("upload",{reference:request.reference,name:cleanName(file.name),mime_type:file.type,content_base64:base64Std(bytes)});
            folderId=driveFile.folder_id;
          }else{
            driveFile=await driveUpload(driveToken!,folderId!,file);
          }
          const folderUpdate=await db.from("help_requests").update({google_drive_folder_id:folderId}).eq("id",request.id);
          if(folderUpdate.error){if(Deno.env.get("GOOGLE_APPS_SCRIPT_URL"))await appsScriptCall("delete",{reference:request.reference,file_id:driveFile.id});else await deleteDriveFile(driveToken!,driveFile.id);throw folderUpdate.error;}
          const fileUrl=driveFile.web_view_link||driveFile.webViewLink||`https://drive.google.com/open?id=${encodeURIComponent(driveFile.id)}`;
          const {error}=await db.from("request_documents").insert({request_id:request.id,google_drive_file_id:driveFile.id,google_drive_folder_id:folderId,internal_url:fileUrl,original_filename:cleanName(file.name),mime_type:file.type,document_type:documentType(form.get("document_type")),size_bytes:file.size,sha256:digest,storage_status:"uploaded",uploaded_at:new Date().toISOString()});
          if(error){if(Deno.env.get("GOOGLE_APPS_SCRIPT_URL"))await appsScriptCall("delete",{reference:request.reference,file_id:driveFile.id});else await deleteDriveFile(driveToken!,driveFile.id);throw error;}
          uploaded.push({id:driveFile.id,name:cleanName(file.name),size_bytes:file.size});
        }
        await audit(null,"request.documents_uploaded","help_request",request.id,"success",{count:uploaded.length,storage:Deno.env.get("GOOGLE_APPS_SCRIPT_URL")?"apps_script":"google_drive"});
        return json(req,{uploaded},201);
      }catch(error){console.error(error);return fail(req,503,"DOCUMENT_STORAGE_UNAVAILABLE","Secure document storage is temporarily unavailable. Please retry your upload.");}
      finally { await db.rpc("release_document_upload",{p_request:request.id,p_lock:lock}); }
    }
    if(path==="/api/v1/requests/admin"&&method==="GET"){if(!await permitted(req,"requests.read"))return fail(req,403,"FORBIDDEN","Insufficient permission.");const page=asNum(u.searchParams.get("page"),1,10000),size=asNum(u.searchParams.get("page_size"),50,500);let q:any=db.from("help_requests").select("*",{count:"exact"}).order("created_at",{ascending:false});for(const k of ["status","urgency"]){if(u.searchParams.get(k))q=q.eq(k,u.searchParams.get(k));}const {data,count,error}=await q.range((page-1)*size,page*size-1);if(error)throw error;return json(req,{requests:(data||[]).map(requestOut),total:count||0,page,page_size:size});}
    if(path==="/api/v1/requests/admin/stats"&&method==="GET"){if(!await permitted(req,"requests.read"))return fail(req,403,"FORBIDDEN","Insufficient permission.");const {data,error}=await db.from("help_requests").select("status");if(error)throw error;const by_status:any={};for(const x of data||[])by_status[x.status]=(by_status[x.status]||0)+1;return json(req,{total:(data||[]).length,by_status});}
    const adminRequest=path.match(/^\/api\/v1\/requests\/admin\/([^/]+)(?:\/(status|documents)(?:\/([^/]+)\/download)?)?$/);if(adminRequest){const [,id,action,docId]=adminRequest;const perm=action==="documents"?"requests.view_documents":"requests.read";const p=await permitted(req,perm);if(!p)return fail(req,403,"FORBIDDEN","Insufficient permission.");const {data:request}=await db.from("help_requests").select("*").eq(requestLookup(id),id).maybeSingle();if(!request)return fail(req,404,"NOT_FOUND","Help request not found.");if(!action&&method==="GET"){const {count}=await db.from("request_documents").select("*",{count:"exact",head:true}).eq("request_id",request.id);const history=await db.from("request_status_history").select("id,from_status,to_status,changed_by,changed_by_name,changed_by_email,created_at").eq("request_id",request.id).order("created_at",{ascending:false});if(history.error)throw history.error;return json(req,{...requestOut(request),document_count:count||0,status_history:history.data||[],last_status_change:history.data?.[0]||null});}if(action==="documents"&&method==="GET"){const {data,error}=await db.from("request_documents").select("id,request_id,google_drive_file_id,original_filename,mime_type,document_type,size_bytes,storage_status,created_at").eq("request_id",request.id);if(error)throw error;if(docId){const doc=(data||[]).find((x:any)=>x.id===docId);if(!doc||!doc.google_drive_file_id)return fail(req,404,"NOT_FOUND","Document not found.");try{const driveToken=await driveAccessToken(),response=await driveDownload(driveToken,doc.google_drive_file_id);if(!response.ok)return fail(req,503,"DOCUMENT_STORAGE_UNAVAILABLE","Document download is temporarily unavailable.");const headers=new Headers(cors(req));headers.set("Content-Type",doc.mime_type||"application/octet-stream");headers.set("Content-Disposition",`attachment; filename*=UTF-8''${encodeURIComponent(doc.original_filename)}`);return new Response(await response.arrayBuffer(),{status:200,headers});}catch(_){return fail(req,503,"DOCUMENT_STORAGE_UNAVAILABLE","Document download is temporarily unavailable.");}}return json(req,(data||[]).map((x:any)=>{const {google_drive_file_id,...safe}=x;return safe;}));}}



    if(path==="/api/v1/admin/dashboard"&&method==="GET"){if(!await permitted(req,"requests.read"))return fail(req,403,"FORBIDDEN","Insufficient permission.");const [{data:r},{data:c}]=await Promise.all([db.from("help_requests").select("status"),db.from("campaigns").select("status")]);const counts:any={};for(const x of r||[])counts[x.status]=(counts[x.status]||0)+1;return json(req,{requests:{total:(r||[]).length,by_status:counts},campaigns:{active:(c||[]).filter((x:any)=>x.status==="active").length,completed:(c||[]).filter((x:any)=>x.status==="completed").length}});}
    if(path==="/api/v1/admin/audit-logs"&&method==="GET"){if(!await permitted(req,"audit.read"))return fail(req,403,"FORBIDDEN","Insufficient permission.");const page=asNum(u.searchParams.get("page"),1,10000),size=asNum(u.searchParams.get("page_size"),50,500),category=u.searchParams.get("category")||"all";let q:any=db.from("audit_logs").select("*",{count:"exact"}).order("created_at",{ascending:false});if(category==="login")q=q.ilike("action","login.%");else if(category==="accounts")q=q.or("action.ilike.user.%,action.ilike.role.%");else if(category==="status")q=q.or("action.ilike.request.status_changed,action.ilike.user.enabled,action.ilike.user.disabled");else if(category==="requests")q=q.ilike("action","request.submitted");else if(category==="contacts")q=q.ilike("action","contact.submitted");else if(category==="other")q=q.not("action","ilike","login.%").not("action","ilike","user.%").not("action","ilike","role.%").not("action","ilike","request.status_changed").not("action","ilike","request.submitted").not("action","ilike","contact.submitted");else if(category!=="all")return fail(req,422,"VALIDATION_ERROR","Unknown audit category.");const {data,count,error}=await q.range((page-1)*size,page*size-1);if(error)throw error;return json(req,{logs:data||[],total:count||0,page,page_size:size,category});}
    if(path==="/api/v1/admin/roles"&&method==="GET"){if(!await permitted(req,"roles.read"))return fail(req,403,"FORBIDDEN","Insufficient permission.");const {data,error}=await db.from("roles").select("id,name,description");if(error)throw error;return json(req,{roles:data||[]});}
    if(path==="/api/v1/admin/users"&&method==="GET"){if(!await permitted(req,"users.read"))return fail(req,403,"FORBIDDEN","Insufficient permission.");const {data,error}=await db.from("profiles").select("id,full_name,email,is_active,created_at,updated_at").order("created_at",{ascending:false});if(error)throw error;const {data:links}=await db.from("user_roles").select("user_id,role_id");return json(req,{users:(data||[]).map((x:any)=>({...x,role_ids:(links||[]).filter((l:any)=>l.user_id===x.id).map((l:any)=>l.role_id)}))});}
    if(path==="/api/v1/admin/users"&&method==="POST"){
      const p=await permitted(req,"users.manage");if(!p)return fail(req,403,"FORBIDDEN","Insufficient permission.");
      const b=await req.json(),fullName=typeof b.full_name==="string"?b.full_name.trim():"",email=typeof b.email==="string"?b.email.trim().toLowerCase():"";
      if(!fullName||fullName.length>160||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof b.password!=="string"||b.password.length<8||b.password.length>128)return fail(req,422,"VALIDATION_ERROR","Enter a valid name, email, password (8–128 characters), and one or more roles.");
      const roleIds=b.role_ids;
      if(!Array.isArray(roleIds)||roleIds.length<1||roleIds.length>20||roleIds.some((id:any)=>typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id))||new Set(roleIds).size!==roleIds.length)return fail(req,422,"VALIDATION_ERROR","Select one or more valid, unique roles.");
      const {data,error}=await db.auth.admin.createUser({email,password:b.password,email_confirm:true,user_metadata:{full_name:fullName}});
      if(error)return fail(req,400,"VALIDATION_ERROR",error.message);
      const assigned=await db.rpc("replace_user_roles",{p_actor:p.id,p_user:data.user.id,p_role_ids:roleIds});
      if(assigned.error){
        const rollback=await db.auth.admin.deleteUser(data.user.id);
        if(rollback.error)console.error("New auth account cleanup failed after role assignment error",{code:rollback.error.status||"unknown"});
        if(assigned.error.code==="42501")return fail(req,403,"FORBIDDEN","Insufficient permission.");
        if(assigned.error.code==="22023")return fail(req,422,"VALIDATION_ERROR","One or more selected roles are invalid.");
        throw assigned.error;
      }
      await audit(p,"user.created","user",data.user.id,"success",{role_ids:roleIds});
      return json(req,{user:{id:data.user.id,email,full_name:fullName,role_ids:assigned.data.role_ids,role_names:assigned.data.role_names}},201);
    }
    const userRoles=path.match(/^\/api\/v1\/admin\/users\/([\w-]+)\/roles$/);if(userRoles&&method==="PATCH"){const p=await permitted(req,"users.manage");if(!p)return fail(req,403,"FORBIDDEN","Insufficient permission.");const b=await req.json();if(!Array.isArray(b.role_ids)||b.role_ids.length>20||b.role_ids.some((id:any)=>typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id))||new Set(b.role_ids).size!==b.role_ids.length)return fail(req,422,"VALIDATION_ERROR","Select a valid set of roles.");const {data,error}=await db.rpc("replace_user_roles",{p_actor:p.id,p_user:userRoles[1],p_role_ids:b.role_ids});if(error){if(error.code==="42501")return fail(req,403,"FORBIDDEN","Insufficient permission.");if(error.code==="P0002")return fail(req,404,"NOT_FOUND","User not found.");if(error.code==="23514")return fail(req,409,"LAST_SUPER_ADMIN","At least one active super-admin must remain.");if(error.code==="22023")return fail(req,422,"VALIDATION_ERROR","One or more selected roles are invalid.");throw error;}return json(req,{updated:true,...data});}
    const userStatus=path.match(/^\/api\/v1\/admin\/users\/([\w-]+)\/status$/);if(userStatus&&method==="PATCH"){const p=await permitted(req,"users.manage");if(!p)return fail(req,403,"FORBIDDEN","Insufficient permission.");const b=await req.json();if(typeof b.is_active!=="boolean")return fail(req,422,"VALIDATION_ERROR","is_active must be a boolean.");const {data,error}=await db.rpc("set_user_active",{p_actor:p.id,p_user:userStatus[1],p_active:b.is_active});if(error){if(error.code==="42501")return fail(req,403,"FORBIDDEN","Insufficient permission.");if(error.code==="P0002")return fail(req,404,"NOT_FOUND","User not found.");if(error.code==="23514")return fail(req,409,"LAST_SUPER_ADMIN","At least one active super-admin must remain.");throw error;}return json(req,{updated:true,...data});}
    if(path==="/api/v1/admin/send-email"&&method==="POST"){const p=await permitted(req,"requests.read");if(!p)return fail(req,403,"FORBIDDEN","Insufficient permission.");const b=await req.json();const sent=await email(b.to,b.subject,`<p>${b.message}</p>`);await audit(p,sent?"email.sent":"email.failed","email",null,sent?"success":"failure",{to:b.to,subject:b.subject});return json(req,{sent});}
    return fail(req,404,"NOT_FOUND","Endpoint not found.");
  } catch (e) { console.error(e); return fail(req,500,"INTERNAL_ERROR","An unexpected error occurred."); }
});
