// All mutations use the service client only after validation/authorization here.
export const validEmail = (v: unknown) => typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const validMobile = (v: unknown) => typeof v === 'string' && /^[0-9]{10}$/.test(v);
export const bounded = (v: unknown, min: number, max: number) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;
export const requestLookup = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? 'id' : 'reference';

export async function productionForms(req: Request, path: string, c: any): Promise<Response | null> {
  const { db, json, fail, permitted, audit, hex, tokenValue, support, urgency, email, requestOut } = c;
  const method = req.method;
  if (path === '/api/v1/contact' && method === 'POST') {
    const b = await req.json();
    if (!bounded(b.full_name,2,120) || !validMobile(b.mobile) || !validEmail(b.email) || !bounded(b.message,10,1000))
      return fail(req,422,'VALIDATION_ERROR','Full name, a 10-digit mobile number, valid email and a 10–1,000 character message are required.');
    const {data,error} = await db.from('contact_submissions').insert({full_name:b.full_name.trim(),mobile:b.mobile,email:b.email,message:b.message.trim()}).select('id').single();
    if(error) throw error;
    await audit(null,'contact.submitted','contact_submission',data.id);
    const admin=Deno.env.get('ADMIN_NOTIFICATION_EMAIL');
    if(admin) (globalThis as any).EdgeRuntime?.waitUntil(email(admin,'New contact message','<p>A new contact message is available in the Foundation Admin contact inbox.</p>').catch(()=>false));
    return json(req,{submission_id:data.id,message:'Your message has been received.'},201);
  }
  const contact = path.match(/^\/api\/v1\/contact\/admin(?:\/([0-9a-f-]{36}))?$/i);
  if (contact && method === 'GET') {
    if (!await permitted(req,'contact.read')) return fail(req,403,'FORBIDDEN','Insufficient permission.');
    const fields='id,full_name,mobile,email,message,created_at';
    if(contact[1]) {
      const {data,error}=await db.from('contact_submissions').select(fields).eq('id',contact[1]).maybeSingle();
      if(error) throw error;
      return data ? json(req,data) : fail(req,404,'NOT_FOUND','Message not found.');
    }
    const page=Math.max(1,Math.min(100000,Number(new URL(req.url).searchParams.get('page'))||1));
    const {data,count,error}=await db.from('contact_submissions').select(fields,{count:'exact'}).order('created_at',{ascending:false}).order('id').range((page-1)*50,page*50-1);
    if(error) throw error;
    return json(req,{messages:data,total:count,page,page_size:50});
  }
  if(path === '/api/v1/requests' && method === 'POST') {
    const b=await req.json(),a=b.applicant||{},r=b.request||{};
    if(b.consent!==true || !bounded(a.full_name,2,120) || !validMobile(a.mobile) || !validEmail(a.email) ||
      !bounded(a.address,2,300) || !bounded(a.city,2,80) || !bounded(a.state,2,80) || !bounded(r.description,10,1000) ||
      !bounded(r.amount_required,1,100) || !Number.isInteger(r.beneficiaries) || r.beneficiaries<1 || r.beneficiaries>1000)
      return fail(req,422,'VALIDATION_ERROR','Check all required fields: mobile must be exactly 10 digits, email valid, and description 10–1,000 characters.');
    if(b.submission_key!==undefined && !/^[0-9a-f]{64}$/.test(b.submission_key)) return fail(req,422,'VALIDATION_ERROR','Invalid submission key.');
    const rawToken=b.submission_key||tokenValue(),hash=await hex(new TextEncoder().encode(rawToken));
    const row={applicant_full_name:a.full_name.trim(),applicant_mobile:a.mobile,applicant_email:a.email,applicant_address:a.address.trim(),applicant_city:a.city.trim(),applicant_state:a.state.trim(),support_type:support(r.support_type),description:r.description.trim(),beneficiaries:r.beneficiaries,amount_required:r.amount_required.trim(),urgency:urgency(r.urgency),consent:true};
    const payloadHash=await hex(new TextEncoder().encode(JSON.stringify(row)));
    let {data,error}=await db.from('help_requests').insert({...row,submission_key_hash:hash,submission_payload_hash:payloadHash,document_upload_token_hash:hash,document_upload_token_expires_at:new Date(Date.now()+86400000).toISOString()}).select().single();
    const reused=error?.code==='23505';
    if(reused) {
      const previous=await db.from('help_requests').select('*').eq('submission_key_hash',hash).single();
      data=previous.data; error=previous.error;
      if(data?.submission_payload_hash!==payloadHash) return fail(req,409,'SUBMISSION_CONFLICT','This submission already exists. Retry with the original details; do not create a duplicate application.');
    }
    if(error) throw error;
    if(!reused) {
      await audit(null,'request.submitted','help_request',data.id,'success',{reference:data.reference});
      // No applicant-controlled HTML in notification content.
      const notify=email(a.email,`Support request received — ${data.reference}`,`<p>Your reference is <strong>${data.reference}</strong>.</p>`);
      const admin=Deno.env.get('ADMIN_NOTIFICATION_EMAIL');
      const tasks=[notify]; if(admin) tasks.push(email(admin,`New request ${data.reference}`,'<p>A new support request is ready for review.</p>'));
      (globalThis as any).EdgeRuntime?.waitUntil(Promise.allSettled(tasks));
    }
    return json(req,{id:data.id,request_id:data.id,reference:data.reference,status:data.status,document_upload_token:rawToken,document_upload_token_expires_at:data.document_upload_token_expires_at},reused?200:201);
  }
  const status=path.match(/^\/api\/v1\/requests\/admin\/([^/]+)\/status$/);
  if(status && method==='PATCH') {
    const actor=await permitted(req,'requests.manage');
    if(!actor) return fail(req,403,'FORBIDDEN','Insufficient permission.');
    const b=await req.json();
    if(!['pending','under_review','accepted','rejected'].includes(b.status) || (b.admin_note!==undefined && (typeof b.admin_note!=='string'||b.admin_note.length>1500))) return fail(req,422,'VALIDATION_ERROR','Invalid status or note (maximum 1,500 characters).');
    const {data:r,error:lookupError}=await db.from('help_requests').select('id,status').eq(requestLookup(status[1]),status[1]).maybeSingle();
    if(lookupError) throw lookupError;
    if(!r) return fail(req,404,'NOT_FOUND','Request not found.');
    const {data,error}=await db.rpc('adjudicate_request',{p_request:r.id,p_actor:actor.id,p_status:b.status,p_note:b.admin_note??null});
    if(error) return fail(req,error.code==='23514'?409:500,'STATUS_UPDATE_FAILED',error.code==='23514'?'This status transition is not allowed. Refresh the case before retrying.':'The decision was not saved.');
    if(r.status!==data.status && data.applicant_email) (globalThis as any).EdgeRuntime?.waitUntil(email(data.applicant_email,`Update on your request ${data.reference}`,`<p>Your request is now ${data.status.replace('_',' ')}.</p>`).catch(()=>false));
    return json(req,{...requestOut(data),message:'Case decision saved.'});
  }
  return null;
}
