import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import McpSettingsCard from "@/components/McpSettingsCard";
import McpTestCard from "@/components/McpTestCard";
import PageSeo from "@/components/PageSeo";


const MCP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp`;
const OAUTH_MCP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-mcp`;


interface McpToken {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const EXPIRY_OPTIONS: { value: string; label: string; days: number | null }[] = [
  { value: "7",   label: "7 days",    days: 7 },
  { value: "30",  label: "30 days (default)", days: 30 },
  { value: "90",  label: "90 days",   days: 90 },
  { value: "365", label: "1 year",    days: 365 },
  { value: "0",   label: "Unlimited (never expires)", days: null },
];

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "rh_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function McpSetup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [tokens, setTokens] = useState<McpToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newExpiry, setNewExpiry] = useState("30");
  const [creating, setCreating] = useState(false);
  const [freshToken, setFreshToken] = useState<string | null>(null);

  const load = async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { navigate("/auth"); return; }
    setEmail(sess.session.user.email ?? "");
    const { data } = await supabase
      .from("roboheard_api_keys")
      .select("id, name, key_prefix, last_used_at, expires_at, created_at")
      .eq("scope", "mcp")
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    setTokens((data ?? []) as McpToken[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const copy = async (v: string, label: string) => {
    await navigator.clipboard.writeText(v);
    toast.success(`${label} copied`);
  };

  const createToken = async () => {
    if (!newName.trim()) { toast.error("Give the token a name"); return; }
    setCreating(true);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { setCreating(false); return; }
    const key = generateKey();
    const hash = await sha256Hex(key);
    const prefix = key.slice(0, 11);
    const opt = EXPIRY_OPTIONS.find((o) => o.value === newExpiry) ?? EXPIRY_OPTIONS[1];
    const expires_at = opt.days === null ? null : new Date(Date.now() + opt.days * 86400_000).toISOString();
    const { error } = await supabase.from("roboheard_api_keys").insert({
      user_id: sess.session.user.id,
      name: newName.trim(),
      key_hash: hash,
      key_prefix: prefix,
      expires_at,
      scope: "mcp",
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    setFreshToken(key);
    setNewName("");
    setNewExpiry("30");
    setShowCreate(false);
    load();
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this token? Any coding agent using it will stop working immediately.")) return;
    const { error } = await supabase
      .from("roboheard_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Token revoked");
    load();
  };

  const displayToken = freshToken ?? "<PASTE_TOKEN>";
  const cursorConfig = JSON.stringify({
    mcpServers: {
      roboheard: {
        type: "http",
        url: MCP_URL,
        headers: { Authorization: `Bearer ${displayToken}` },
      },
    },
  }, null, 2);
  const claudeConfig = cursorConfig;
  const claudeCli = `claude mcp add --transport http roboheard ${MCP_URL} \\\n  --header "Authorization: Bearer ${displayToken}"`;
  const claudeOauthCli = `claude mcp add --transport http roboheard-oauth ${OAUTH_MCP_URL}\n# then run /mcp inside Claude Code and pick "roboheard-oauth" to sign in`;
  const codexConfig = `# ~/.codex/config.toml\n[mcp_servers.roboheard]\nurl = "${MCP_URL}"\n\n[mcp_servers.roboheard.http_headers]\nAuthorization = "Bearer ${displayToken}"`;
  const vscodeConfig = JSON.stringify({
    servers: {
      roboheard: {
        type: "http",
        url: MCP_URL,
        headers: { Authorization: `Bearer ${displayToken}` },
      },
    },
  }, null, 2);



  const expiryLabel = (t: McpToken) => {
    if (!t.expires_at) return "Never expires";
    const ms = new Date(t.expires_at).getTime() - Date.now();
    if (ms <= 0) return "Expired";
    const days = Math.floor(ms / 86400_000);
    return days > 0 ? `Expires in ${days}d` : `Expires in ${Math.floor(ms / 3_600_000)}h`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <PageSeo
        title="MCP Setup — Connect Claude Code, Cursor & Codex"
        description="Expose RoboHeard's Conductor, per-model chat, and Perplexity web search as MCP tools inside any coding agent. One-line install."
        path="/mcp"
      />
      <div className="max-w-3xl mx-auto space-y-6">

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/tools"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
          </Button>
          <h1 className="text-2xl font-semibold">MCP for Coding Agents</h1>
        </div>

        <Card className="p-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            Expose RoboHeard's Conductor, individual models, live web search, and your chat history as tools inside
            Claude Code, Cursor, Codex, or any MCP-compatible coding agent. Every call runs as
            <span className="font-medium text-foreground"> {email || "you"}</span> and spends your RoboHeard tokens.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-md border border-border p-3 space-y-1">
              <div className="font-medium">Token endpoint (recommended for CLI agents)</div>
              <code className="text-xs break-all block">{MCP_URL}</code>
              <div className="text-xs text-muted-foreground">Auth: <code>Bearer rh_&lt;token&gt;</code> — create one below.</div>
            </div>
            <div className="rounded-md border border-border p-3 space-y-1">
              <div className="font-medium">OAuth endpoint (one-click clients)</div>
              <code className="text-xs break-all block">{OAUTH_MCP_URL}</code>
              <div className="text-xs text-muted-foreground">Auth: OAuth 2.1 — you sign in and approve in the browser.</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Both endpoints expose the same tool set and honour the MCP configuration below.
          </p>
        </Card>


        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium">1. Your MCP tokens</h2>
              <p className="text-xs text-muted-foreground">Long-lived tokens for coding agents. Default 30 days, or unlimited.</p>
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-3 w-3 mr-1" />New token
            </Button>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Loading…</div>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">No MCP tokens yet. Create one to connect your coding agent.</p>
          ) : (
            <div className="space-y-2">
              {tokens.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{t.key_prefix}…</div>
                    <div className="text-xs text-muted-foreground">
                      {expiryLabel(t)} · Last used: {t.last_used_at ? new Date(t.last_used_at).toLocaleString() : "never"}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => revoke(t.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-medium">2. Add to Cursor / Codex</h2>
          <p className="text-xs text-muted-foreground">Add to <code>~/.cursor/mcp.json</code> (Cursor) or your Codex/Windsurf MCP config:</p>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre">{cursorConfig}</pre>
          <Button variant="outline" size="sm" onClick={() => copy(cursorConfig, "Cursor config")}>
            <Copy className="h-3 w-3 mr-1" />Copy
          </Button>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-medium">3. Add to Claude Code</h2>
          <p className="text-xs text-muted-foreground">One-liner (recommended):</p>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre">{claudeCli}</pre>
          <Button variant="outline" size="sm" onClick={() => copy(claudeCli, "Claude CLI command")}>
            <Copy className="h-3 w-3 mr-1" />Copy command
          </Button>
          <p className="text-xs text-muted-foreground pt-2">Or add manually to <code>~/.claude/mcp_config.json</code>:</p>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre">{claudeConfig}</pre>
          <Button variant="outline" size="sm" onClick={() => copy(claudeConfig, "Claude config")}>
            <Copy className="h-3 w-3 mr-1" />Copy config
          </Button>
          <p className="text-xs text-muted-foreground pt-1">⚠️ Use an <code>rh_*</code> token from above — Supabase session JWTs expire after ~60 minutes.</p>
        </Card>


        <Card className="p-5 space-y-2">
          <h2 className="font-medium">Available tools</h2>
          <ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">
            <li><code className="text-foreground">list_models</code> — discover platforms, model ids &amp; capabilities</li>
            <li><code className="text-foreground">ask_model</code> — one-shot query with optional think / search / deep_research / code_exec</li>
            <li><code className="text-foreground">web_search</code> — Perplexity live search with citations</li>
            <li><code className="text-foreground">conductor_route</code> / <code className="text-foreground">conductor_compare</code> / <code className="text-foreground">conductor_ask</code> / <code className="text-foreground">conductor_debate</code> — multi-model orchestration</li>
            <li><code className="text-foreground">list_chats</code> / <code className="text-foreground">get_chat</code> / <code className="text-foreground">search_messages</code> — read your RoboHeard history</li>
          </ul>
          <p className="text-xs text-muted-foreground pt-2">Chats created by these tools appear in your RoboHeard sidebar.</p>

        </Card>

        <McpSettingsCard />

        <McpTestCard />
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create MCP token</DialogTitle>
            <DialogDescription>This token authenticates your coding agent as you.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tname">Name</Label>
              <Input id="tname" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Cursor on my laptop" />
            </div>
            <div className="space-y-1.5">
              <Label>Expires</Label>
              <Select value={newExpiry} onValueChange={setNewExpiry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createToken} disabled={creating}>
              {creating && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!freshToken} onOpenChange={(o) => !o && setFreshToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new MCP token</DialogTitle>
            <DialogDescription>Copy it now — we only store a hash and can't show it again. It's already pasted into the config snippets above.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 py-2">
            <Input value={freshToken ?? ""} readOnly className="font-mono text-xs" />
            <Button onClick={() => freshToken && copy(freshToken, "Token")}><Copy className="h-4 w-4" /></Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setFreshToken(null)}>I've saved it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
