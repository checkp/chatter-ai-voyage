import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Copy, Key, Plus, Trash2, Loader2 } from "lucide-react";

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const base = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `rh_${base}`;
}

export default function ApiAccess() {
  const navigate = useNavigate();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadKeys = async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { navigate("/auth"); return; }
    const { data, error } = await supabase
      .from("roboheard_api_keys")
      .select("id, name, key_prefix, last_used_at, created_at")
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load keys");
    setKeys((data ?? []) as ApiKey[]);
    setLoading(false);
  };

  useEffect(() => { loadKeys(); }, []);

  const createKey = async () => {
    if (!newKeyName.trim()) { toast.error("Give the key a name"); return; }
    setCreating(true);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { setCreating(false); return; }
    const key = generateKey();
    const hash = await sha256Hex(key);
    const prefix = key.slice(0, 11); // rh_ + 8 chars
    const { error } = await supabase.from("roboheard_api_keys").insert({
      user_id: sess.session.user.id,
      name: newKeyName.trim(),
      key_hash: hash,
      key_prefix: prefix,
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    setFreshKey(key);
    setNewKeyName("");
    setShowCreate(false);
    loadKeys();
  };

  const revokeKey = async (id: string) => {
    if (!confirm("Revoke this key? Any script using it will stop working immediately.")) return;
    const { error } = await supabase
      .from("roboheard_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Key revoked");
    loadKeys();
  };

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const curlExample = `curl -X POST ${API_URL}/v1/chat \\
  -H "Authorization: Bearer ${freshKey ?? "rh_YOUR_KEY"}" \\
  -H "Content-Type: application/json" \\
  -d '{"platform":"openai","prompt":"Hello in one sentence"}'`;

  const searchExample = `curl -X POST ${API_URL}/v1/search \\
  -H "Authorization: Bearer rh_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"query":"latest React 19 release notes","recency":"month"}'`;

  const conductorExample = `curl -X POST ${API_URL}/v1/conductor \\
  -H "Authorization: Bearer rh_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"Design a rate limiter for a public API"}'`;

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/tools"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
          </Button>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold">API Access</h1>
          </div>
        </div>

        <Card className="p-5 space-y-2">
          <p className="text-sm text-muted-foreground">
            Call RoboHeard from any script or backend with a personal API key. Runs as you and spends your RoboHeard tokens.
            Respects your MCP settings — disabled tools and platforms are blocked here too.
          </p>
          <div className="text-sm">
            <span className="text-muted-foreground">Base URL</span><br />
            <code className="text-xs break-all">{API_URL}</code>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Your API keys</h2>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-3 w-3 mr-1" />New key
            </Button>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Loading…</div>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No keys yet. Create one to start calling the API.</p>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{k.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{k.key_prefix}…</div>
                    <div className="text-xs text-muted-foreground">
                      Last used: {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => revokeKey(k.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-medium">Endpoints</h2>
          <ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">
            <li><code className="text-foreground">GET  /v1/tools</code> — list tools available to your key</li>
            <li><code className="text-foreground">GET  /v1/models</code> — list AI platforms &amp; models</li>
            <li><code className="text-foreground">POST /v1/chat</code> — single-model chat (<code>ask_model</code>)</li>
            <li><code className="text-foreground">POST /v1/search</code> — Perplexity web search with citations</li>
            <li><code className="text-foreground">POST /v1/conductor</code> — multi-model orchestrated answer</li>
            <li><code className="text-foreground">POST /v1/tools/call</code> — generic <code>{`{tool, arguments}`}</code> dispatcher</li>
          </ul>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Example — chat</h2>
            <Button variant="outline" size="sm" onClick={() => copy(curlExample, "cURL")}><Copy className="h-3 w-3 mr-1" />Copy</Button>
          </div>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre">{curlExample}</pre>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Example — web search</h2>
            <Button variant="outline" size="sm" onClick={() => copy(searchExample, "cURL")}><Copy className="h-3 w-3 mr-1" />Copy</Button>
          </div>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre">{searchExample}</pre>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Example — conductor</h2>
            <Button variant="outline" size="sm" onClick={() => copy(conductorExample, "cURL")}><Copy className="h-3 w-3 mr-1" />Copy</Button>
          </div>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre">{conductorExample}</pre>
        </Card>
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>Give it a name so you can find it later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="keyname">Name</Label>
            <Input id="keyname" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g. Local dev laptop" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createKey} disabled={creating}>{creating && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fresh key dialog */}
      <Dialog open={!!freshKey} onOpenChange={(o) => !o && setFreshKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new API key</DialogTitle>
            <DialogDescription>
              Copy this now — for security we only store a hash and can't show it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <div className="flex gap-2">
              <Input value={freshKey ?? ""} readOnly className="font-mono text-xs" />
              <Button onClick={() => freshKey && copy(freshKey, "API key")}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setFreshKey(null)}>I've saved it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
