import http from "node:http";
import crypto from "node:crypto";
import { google } from "googleapis";

const port = Number(process.env.PORT || 8080);
const folderId = process.env.GOOGLE_DRIVE_CHARITY_REQUESTS_FOLDER_ID;
const hmacSecret = process.env.BROKER_HMAC_SECRET;
const maxBytes = 10 * 1024 * 1024;
if (!folderId || !hmacSecret) throw new Error("GOOGLE_DRIVE_CHARITY_REQUESTS_FOLDER_ID and BROKER_HMAC_SECRET are required");

const auth = new google.auth.GoogleAuth({ scopes: ["https://www.googleapis.com/auth/drive"] });
const drive = google.drive({ version: "v3", auth });
const safeName = (name) => String(name || "document").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 180) || "document";
const json = (res, status, body) => { res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((resolve, reject) => { const chunks=[]; let total=0; req.on("data", c => { total += c.length; if (total > maxBytes + 1024 * 1024) { reject(new Error("payload too large")); req.destroy(); return; } chunks.push(c); }); req.on("end", () => resolve(Buffer.concat(chunks))); req.on("error", reject); });
function authorized(req, raw) {
  const timestamp = req.headers["x-broker-timestamp"], signature = req.headers["x-broker-signature"];
  if (!timestamp || !signature || !/^\d+$/.test(String(timestamp)) || Math.abs(Date.now() - Number(timestamp)) > 300000) return false;
  const expected = crypto.createHmac("sha256", hmacSecret).update(`${timestamp}.${raw.toString("utf8")}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(String(signature)), Buffer.from(expected));
}
async function requestFolder(reference) {
  const q = `'${folderId}' in parents and name = '${String(reference).replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const found = await drive.files.list({ q, fields: "files(id,name)", pageSize: 1 });
  if (found.data.files?.[0]) return found.data.files[0].id;
  const made = await drive.files.create({ requestBody: { name: safeName(reference), mimeType: "application/vnd.google-apps.folder", parents: [folderId] }, fields: "id" });
  return made.data.id;
}
async function main(req, res) {
  if (req.method === "GET" && req.url === "/health") return json(res, 200, { status: "ok" });
  if (req.method !== "POST" || !["/v1/upload", "/v1/download"].includes(req.url)) return json(res, 404, { error: "not_found" });
  const raw = await readBody(req).catch(() => null); if (!raw || !authorized(req, raw)) return json(res, 401, { error: "unauthorized" });
  const body = JSON.parse(raw.toString("utf8"));
  if (req.url === "/v1/upload") {
    if (!body.reference || !body.name || !body.mime_type || !body.content_base64) return json(res, 422, { error: "invalid_payload" });
    const bytes = Buffer.from(body.content_base64, "base64"); if (!bytes.length || bytes.length > maxBytes) return json(res, 422, { error: "invalid_size" });
    const parent = await requestFolder(body.reference);
    const created = await drive.files.create({ requestBody: { name: safeName(body.name), parents: [parent], mimeType: body.mime_type }, media: { mimeType: body.mime_type, body: Buffer.from(bytes) }, fields: "id,name,mimeType,size" });
    return json(res, 201, { id: created.data.id, name: created.data.name, mime_type: created.data.mimeType, size_bytes: Number(created.data.size || bytes.length), folder_id: parent });
  }
  if (!body.file_id) return json(res, 422, { error: "invalid_payload" });
  const meta = await drive.files.get({ fileId: body.file_id, fields: "id,name,mimeType,size" });
  const media = await drive.files.get({ fileId: body.file_id, alt: "media" }, { responseType: "arraybuffer" });
  return json(res, 200, { id: meta.data.id, name: meta.data.name, mime_type: meta.data.mimeType, size_bytes: Number(meta.data.size || media.data.byteLength), content_base64: Buffer.from(media.data).toString("base64") });
}
http.createServer((req, res) => main(req, res).catch(e => { console.error(e); json(res, 502, { error: "drive_unavailable" }); })).listen(port, "0.0.0.0");
