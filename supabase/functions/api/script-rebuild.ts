/** Validates the Apps Script bridge response before any staff-visible write. */
export async function rebuildViaScript(reference:string,mime:string,bytes:Uint8Array,
  call:(operation:string,payload:Record<string,unknown>)=>Promise<any>,
  encode:(bytes:Uint8Array)=>string,decode:(value:string)=>Uint8Array):Promise<Uint8Array> {
  if(!/^STF-[0-9]{4}-[0-9]{6,}$/.test(reference)||!bytes.length||bytes.length>10485760||!['application/pdf','image/jpeg','image/png','image/webp'].includes(mime))throw new Error('Invalid rebuild request');
  const result=await call('rebuild',{reference,mime_type:mime,content_base64:encode(bytes)});
  if(result?.mime_type!==mime||typeof result?.content_base64!=='string'||result.content_base64.length>13981016||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(result.content_base64))throw new Error('Invalid rebuild response');
  const output=decode(result.content_base64);if(!output.length||output.length>10485760)throw new Error('Invalid rebuild size');
  const starts=(...values:number[])=>values.every((value,index)=>output[index]===value);
  const valid=mime==='application/pdf'?starts(37,80,68,70,45):mime==='image/jpeg'?starts(255,216,255):mime==='image/png'?starts(137,80,78,71,13,10,26,10):starts(82,73,70,70)&&String.fromCharCode(...output.slice(8,12))==='WEBP';
  if(!valid)throw new Error('Invalid rebuilt format');
  return output;
}
