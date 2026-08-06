import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AUTH_BASE = "https://webapp-prod.cloud.remarkable.engineering";
const SYNC_BASE = "https://internal.cloud.remarkable.com";
const BUCKET = "remarkable-notes";
const OCR_MODEL = "google/gemini-2.5-flash";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/* ------------------------------------------------------------------ */
/* reMarkable cloud helpers                                            */
/* ------------------------------------------------------------------ */

async function registerDevice(code: string, deviceId: string): Promise<string> {
  const res = await fetch(`${AUTH_BASE}/token/json/2/device/new`, {
    method: "POST",
    headers: { Authorization: "Bearer", "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      deviceDesc: "desktop-linux",
      deviceID: deviceId,
    }),
  });
  const text = (await res.text()).trim();
  if (!res.ok || !text) {
    throw new Error(
      `Pairing failed [${res.status}]: ${text || "reMarkable rejected the code"}. ` +
        `Codes are single-use and expire in ~5 minutes — grab a fresh one.`,
    );
  }
  return text;
}

async function refreshUserToken(deviceToken: string): Promise<{ token: string; expiresAt: string }> {
  const res = await fetch(`${AUTH_BASE}/token/json/2/user/new`, {
    method: "POST",
    headers: { Authorization: `Bearer ${deviceToken}`, "Content-Type": "application/json" },
    body: "",
  });
  const text = (await res.text()).trim();
  if (!res.ok || !text) throw new Error(`Session refresh failed [${res.status}]: ${text}`);

  // JWT exp when parseable, otherwise assume 1 hour.
  let expMs = Date.now() + 55 * 60 * 1000;
  try {
    const payload = JSON.parse(atob(text.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload?.exp) expMs = payload.exp * 1000 - 5 * 60 * 1000;
  } catch { /* not a JWT — keep default */ }

  return { token: text, expiresAt: new Date(expMs).toISOString() };
}

async function getUserToken(admin: any, userId: string) {
  const { data: conn } = await admin
    .from("remarkable_connections")
    .select("device_token, user_token, user_token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!conn) throw new Error("No reMarkable tablet is connected.");

  const fresh =
    conn.user_token &&
    conn.user_token_expires_at &&
    new Date(conn.user_token_expires_at).getTime() > Date.now();

  if (fresh) return conn.user_token as string;

  const { token, expiresAt } = await refreshUserToken(conn.device_token);
  await admin
    .from("remarkable_connections")
    .update({ user_token: token, user_token_expires_at: expiresAt })
    .eq("user_id", userId);
  return token;
}

async function fetchBlob(hash: string, token: string): Promise<Response> {
  const res = await fetch(`${SYNC_BASE}/sync/v3/files/${hash}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Blob ${hash} failed [${res.status}]: ${await res.text()}`);
  return res;
}

type IndexEntry = { hash: string; kind: string; id: string; subfiles: number; size: number };

function parseIndex(text: string): IndexEntry[] {
  return text
    .split("\n")
    .slice(1) // schema version line
    .filter((l) => l.trim().length > 0)
    .map((l) => {
      const [hash, kind, id, subfiles, size] = l.split(":");
      return { hash, kind, id, subfiles: Number(subfiles) || 0, size: Number(size) || 0 };
    });
}

/** Walk the sync tree and return every document/folder with its metadata. */
async function listDocuments(token: string) {
  const rootRes = await fetch(`${SYNC_BASE}/sync/v4/root`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!rootRes.ok) {
    throw new Error(`Could not read tablet root [${rootRes.status}]: ${await rootRes.text()}`);
  }
  const root = await rootRes.json();
  const rootIndex = parseIndex(await (await fetchBlob(root.hash, token)).text());

  const results: any[] = [];
  const queue = [...rootIndex];
  const CONCURRENCY = 8;

  async function worker() {
    while (queue.length) {
      const entry = queue.shift();
      if (!entry) return;
      try {
        const docIndex = parseIndex(await (await fetchBlob(entry.hash, token)).text());
        const metaEntry = docIndex.find((f) => f.id.endsWith(".metadata"));
        if (!metaEntry) continue;
        const meta = await (await fetchBlob(metaEntry.hash, token)).json();
        if (meta.deleted) continue;
        results.push({
          doc_id: entry.id,
          name: meta.visibleName ?? "Untitled",
          parent_id: meta.parent || null,
          doc_type: meta.type ?? "DocumentType",
          modified_at: meta.lastModified
            ? new Date(Number(meta.lastModified)).toISOString()
            : null,
        });
      } catch (e) {
        console.error("doc walk error", entry.id, String(e));
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

/** Rendered PDF export of one document (includes handwriting). */
async function exportPdf(docId: string, token: string): Promise<Uint8Array> {
  const res = await fetch(`${SYNC_BASE}/doc/v2/files/${docId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/pdf" },
  });
  if (res.ok) return new Uint8Array(await res.arrayBuffer());
  const primaryErr = `${res.status} ${await res.text()}`;

  // Fallback: raw attached PDF blob from the document index, if any.
  try {
    const rootRes = await fetch(`${SYNC_BASE}/sync/v4/root`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const root = await rootRes.json();
    const rootIndex = parseIndex(await (await fetchBlob(root.hash, token)).text());
    const docEntry = rootIndex.find((e) => e.id === docId);
    if (docEntry) {
      const docIndex = parseIndex(await (await fetchBlob(docEntry.hash, token)).text());
      const pdfEntry = docIndex.find((f) => f.id.endsWith(".pdf"));
      if (pdfEntry) {
        return new Uint8Array(await (await fetchBlob(pdfEntry.hash, token)).arrayBuffer());
      }
    }
  } catch (e) {
    console.error("pdf fallback failed", String(e));
  }
  throw new Error(`PDF export failed [${primaryErr}]`);
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/* ------------------------------------------------------------------ */
/* handler                                                             */
/* ------------------------------------------------------------------ */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user?.id) return json({ error: "Unauthorized" }, 401);
    const userId = user.id;

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = String(body.action ?? "status");

    switch (action) {
      /* ---------------- status ---------------- */
      case "status": {
        const { data: conn } = await admin
          .from("remarkable_connections")
          .select("connected_at, last_sync_at")
          .eq("user_id", userId)
          .maybeSingle();
        return json({
          connected: !!conn,
          connected_at: conn?.connected_at ?? null,
          last_sync_at: conn?.last_sync_at ?? null,
        });
      }

      /* ---------------- pair ---------------- */
      case "pair": {
        const code = String(body.code ?? "").trim().toLowerCase();
        if (!/^[a-z0-9]{8}$/.test(code)) {
          return json({ error: "Enter the 8-character code from my.remarkable.com/device/desktop/connect" }, 400);
        }
        const deviceId = crypto.randomUUID();
        const deviceToken = await registerDevice(code, deviceId);
        const { token, expiresAt } = await refreshUserToken(deviceToken);

        const { error } = await admin.from("remarkable_connections").upsert(
          {
            user_id: userId,
            device_id: deviceId,
            device_token: deviceToken,
            user_token: token,
            user_token_expires_at: expiresAt,
            connected_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
        if (error) throw new Error(error.message);
        return json({ connected: true });
      }

      /* ---------------- disconnect ---------------- */
      case "disconnect": {
        await admin.from("remarkable_connections").delete().eq("user_id", userId);
        const { data: notes } = await admin
          .from("remarkable_notes")
          .select("pdf_path")
          .eq("user_id", userId)
          .not("pdf_path", "is", null);
        const paths = (notes ?? []).map((n: any) => n.pdf_path).filter(Boolean);
        if (paths.length) await admin.storage.from(BUCKET).remove(paths);
        await admin.from("remarkable_notes").delete().eq("user_id", userId);
        return json({ connected: false });
      }

      /* ---------------- sync (notebook tree) ---------------- */
      case "sync": {
        const token = await getUserToken(admin, userId);
        const docs = await listDocuments(token);

        if (docs.length) {
          const rows = docs.map((d) => ({ ...d, user_id: userId, synced_at: new Date().toISOString() }));
          const { error } = await admin
            .from("remarkable_notes")
            .upsert(rows, { onConflict: "user_id,doc_id" });
          if (error) throw new Error(error.message);

          // Drop rows that no longer exist on the tablet.
          const ids = docs.map((d) => d.doc_id);
          await admin
            .from("remarkable_notes")
            .delete()
            .eq("user_id", userId)
            .not("doc_id", "in", `(${ids.map((i) => `"${i}"`).join(",")})`);
        }

        await admin
          .from("remarkable_connections")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("user_id", userId);

        return json({ count: docs.length });
      }

      /* ---------------- fetch one document as PDF ---------------- */
      case "fetch_pdf": {
        const docId = String(body.doc_id ?? "");
        if (!docId) return json({ error: "doc_id is required" }, 400);

        const token = await getUserToken(admin, userId);
        const pdf = await exportPdf(docId, token);
        const path = `${userId}/${docId}.pdf`;

        const { error: upErr } = await admin.storage
          .from(BUCKET)
          .upload(path, pdf, { contentType: "application/pdf", upsert: true });
        if (upErr) throw new Error(upErr.message);

        await admin
          .from("remarkable_notes")
          .update({ pdf_path: path, pdf_size: pdf.length })
          .eq("user_id", userId)
          .eq("doc_id", docId);

        const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(path, 3600);
        return json({ pdf_path: path, size: pdf.length, url: signed?.signedUrl ?? null });
      }

      /* ---------------- signed url for a stored pdf ---------------- */
      case "signed_url": {
        const docId = String(body.doc_id ?? "");
        const { data: note } = await admin
          .from("remarkable_notes")
          .select("pdf_path")
          .eq("user_id", userId)
          .eq("doc_id", docId)
          .maybeSingle();
        if (!note?.pdf_path) return json({ error: "This note has not been fetched yet." }, 404);
        const { data: signed } = await admin.storage
          .from(BUCKET)
          .createSignedUrl(note.pdf_path, 3600);
        return json({ url: signed?.signedUrl ?? null });
      }

      /* ---------------- handwriting -> text ---------------- */
      case "extract_text": {
        const docId = String(body.doc_id ?? "");
        if (!docId) return json({ error: "doc_id is required" }, 400);

        const { data: note } = await admin
          .from("remarkable_notes")
          .select("pdf_path, name")
          .eq("user_id", userId)
          .eq("doc_id", docId)
          .maybeSingle();

        let pdf: Uint8Array | null = null;
        if (note?.pdf_path) {
          const { data: file } = await admin.storage.from(BUCKET).download(note.pdf_path);
          if (file) pdf = new Uint8Array(await file.arrayBuffer());
        }
        if (!pdf) {
          const token = await getUserToken(admin, userId);
          pdf = await exportPdf(docId, token);
          const path = `${userId}/${docId}.pdf`;
          await admin.storage
            .from(BUCKET)
            .upload(path, pdf, { contentType: "application/pdf", upsert: true });
          await admin
            .from("remarkable_notes")
            .update({ pdf_path: path, pdf_size: pdf.length })
            .eq("user_id", userId)
            .eq("doc_id", docId);
        }

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: OCR_MODEL,
            messages: [
              {
                role: "system",
                content:
                  "You transcribe handwritten notes from a reMarkable tablet. Output the note content as clean markdown: preserve headings, bullets, numbering, checkboxes and tables. Transcribe diagrams as short bracketed descriptions. No preamble, no commentary.",
              },
              {
                role: "user",
                content: [
                  { type: "text", text: `Transcribe this notebook: "${note?.name ?? docId}".` },
                  {
                    type: "file",
                    file: { filename: `${docId}.pdf`, file_data: `data:application/pdf;base64,${toBase64(pdf)}` },
                  },
                ],
              },
            ],
          }),
        });

        if (!aiRes.ok) {
          const detail = await aiRes.text();
          console.error(`OCR failed [${aiRes.status}]: ${detail}`);
          return json({ error: "Transcription failed", status: aiRes.status, details: detail }, aiRes.status);
        }

        const aiJson = await aiRes.json();
        const text = aiJson?.choices?.[0]?.message?.content ?? "";

        await admin
          .from("remarkable_notes")
          .update({
            extracted_text: text,
            extracted_at: new Date().toISOString(),
            extract_model: OCR_MODEL,
          })
          .eq("user_id", userId)
          .eq("doc_id", docId);

        return json({ text, model: OCR_MODEL });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    console.error("remarkable error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
