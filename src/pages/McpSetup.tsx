import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, ArrowLeft, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import McpSettingsCard from "@/components/McpSettingsCard";
import McpTestCard from "@/components/McpTestCard";

const MCP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp`;

export default function McpSetup() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [email, setEmail] = useState<string>("");

  const loadSession = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      navigate("/auth");
      return;
    }
    setToken(data.session.access_token);
    setExpiresAt(data.session.expires_at ?? null);
    setEmail(data.session.user.email ?? "");
  };

  useEffect(() => { loadSession(); }, []);

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const refreshToken = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      toast.error("Could not refresh session — sign in again");
      navigate("/auth");
      return;
    }
    setToken(data.session.access_token);
    setExpiresAt(data.session.expires_at ?? null);
    toast.success("Token refreshed");
  };

  const expiresIn = expiresAt ? Math.max(0, expiresAt - Math.floor(Date.now() / 1000)) : 0;
  const expiresMin = Math.floor(expiresIn / 60);

  const cursorConfig = JSON.stringify({
    mcpServers: {
      roboheard: {
        url: MCP_URL,
        headers: { Authorization: `Bearer ${token || "<PASTE_TOKEN>"}` },
      },
    },
  }, null, 2);

  const claudeConfig = JSON.stringify({
    mcpServers: {
      roboheard: {
        type: "http",
        url: MCP_URL,
        headers: { Authorization: `Bearer ${token || "<PASTE_TOKEN>"}` },
      },
    },
  }, null, 2);

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
          </Button>
          <h1 className="text-2xl font-semibold">MCP for Coding Agents</h1>
        </div>

        <Card className="p-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            Expose RoboHeard's Conductor, individual models, and Perplexity web search as tools inside
            Claude Code, Cursor, Codex, or any MCP-compatible coding agent. Every call runs as
            <span className="font-medium text-foreground"> {email || "you"}</span> and spends your RoboHeard tokens.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            <div><span className="text-muted-foreground">Endpoint</span><br /><code className="text-xs break-all">{MCP_URL}</code></div>
            <div><span className="text-muted-foreground">Auth</span><br /><code className="text-xs">Bearer &lt;session token&gt;</code></div>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">1. Your session token</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {expiresMin > 0 ? `expires in ${expiresMin} min` : "expired"}
              </span>
              <Button variant="outline" size="sm" onClick={refreshToken}>
                <RefreshCw className="h-3 w-3 mr-1" />Refresh
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Input value={token} readOnly className="font-mono text-xs" />
            <Button onClick={() => copy(token, "Token")} size="sm"><Copy className="h-4 w-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tokens expire after 1 hour. Come back here and click Refresh, then paste the new value into your coding agent's MCP config.
          </p>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-medium">2. Add to Cursor / Codex</h2>
          <p className="text-xs text-muted-foreground">
            Add to <code>~/.cursor/mcp.json</code> (Cursor) or your Codex/Windsurf MCP config:
          </p>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre">{cursorConfig}</pre>
          <Button variant="outline" size="sm" onClick={() => copy(cursorConfig, "Cursor config")}>
            <Copy className="h-3 w-3 mr-1" />Copy
          </Button>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-medium">3. Add to Claude Code</h2>
          <p className="text-xs text-muted-foreground">
            Add to <code>~/.claude/mcp_config.json</code> or run <code>claude mcp add</code>:
          </p>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre">{claudeConfig}</pre>
          <Button variant="outline" size="sm" onClick={() => copy(claudeConfig, "Claude config")}>
            <Copy className="h-3 w-3 mr-1" />Copy
          </Button>
          <p className="text-xs text-muted-foreground">Or the one-liner:</p>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{`claude mcp add --transport http roboheard ${MCP_URL} \\
  --header "Authorization: Bearer ${token ? token.slice(0, 12) + "..." : "<TOKEN>"}"`}</pre>
        </Card>

        <Card className="p-5 space-y-2">
          <h2 className="font-medium">Available tools</h2>
          <ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">
            <li><code className="text-foreground">list_models</code> — discover platforms &amp; capabilities</li>
            <li><code className="text-foreground">ask_model</code> — one-shot query to a specific model</li>
            <li><code className="text-foreground">web_search</code> — Perplexity live search with citations</li>
            <li><code className="text-foreground">conductor_ask</code> / <code className="text-foreground">conductor_route</code> / <code className="text-foreground">conductor_compare</code> / <code className="text-foreground">conductor_debate</code> — multi-model orchestration</li>
          </ul>
          <p className="text-xs text-muted-foreground pt-2">
            Chats created by these tools appear in your RoboHeard sidebar.
          </p>
        </Card>

        <McpSettingsCard />
      </div>
    </div>
  );
}
