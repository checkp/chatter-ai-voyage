import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, PlayCircle } from "lucide-react";

const MCP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp`;

const EXAMPLE_CALLS: Record<string, Record<string, unknown>> = {
  list_models: {},
  web_search: { query: "latest React 19 release notes", recency: "month" },
  ask_model: { platform: "openai", prompt: "In one sentence, what is MCP?" },
  conductor_route: { prompt: "Design a rate-limiter for a public API" },
};

async function rpc(method: string, params: Record<string, unknown> | undefined, jwt: string) {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

export default function McpTestCard() {
  const [tools, setTools] = useState<Array<{ name: string; title?: string }> | null>(null);
  const [listStatus, setListStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [listError, setListError] = useState<string>("");

  const [selectedTool, setSelectedTool] = useState<string>("list_models");
  const [argsText, setArgsText] = useState<string>(JSON.stringify(EXAMPLE_CALLS.list_models, null, 2));
  const [callStatus, setCallStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [callResult, setCallResult] = useState<string>("");

  const runList = async () => {
    setListStatus("loading"); setListError("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Not signed in");
      const result = await rpc("tools/list", undefined, data.session.access_token);
      setTools(result.tools ?? []);
      setListStatus("ok");
    } catch (e) {
      setListError(e instanceof Error ? e.message : String(e));
      setListStatus("err");
    }
  };

  const runCall = async () => {
    setCallStatus("loading"); setCallResult("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Not signed in");
      let args: Record<string, unknown> = {};
      try { args = argsText.trim() ? JSON.parse(argsText) : {}; }
      catch { throw new Error("Arguments must be valid JSON"); }
      const result = await rpc("tools/call", { name: selectedTool, arguments: args }, data.session.access_token);
      setCallResult(JSON.stringify(result, null, 2));
      setCallStatus(result?.isError ? "err" : "ok");
    } catch (e) {
      setCallResult(e instanceof Error ? e.message : String(e));
      setCallStatus("err");
    }
  };

  const pickTool = (name: string) => {
    setSelectedTool(name);
    setArgsText(JSON.stringify(EXAMPLE_CALLS[name] ?? {}, null, 2));
    setCallStatus("idle");
    setCallResult("");
  };

  const StatusIcon = ({ s }: { s: typeof listStatus }) =>
    s === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> :
    s === "ok" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
    s === "err" ? <XCircle className="h-4 w-4 text-destructive" /> : null;

  return (
    <Card className="p-5 space-y-5">
      <div>
        <h2 className="font-medium">Test your MCP endpoint</h2>
        <p className="text-xs text-muted-foreground">Runs live JSON-RPC calls against your MCP server using your session token.</p>
      </div>

      {/* Test 1: tools/list */}
      <div className="space-y-2 rounded-md border border-border p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon s={listStatus} />
            <span className="text-sm font-medium">tools/list</span>
            <span className="text-xs text-muted-foreground">verifies enabled tools</span>
          </div>
          <Button size="sm" variant="outline" onClick={runList} disabled={listStatus === "loading"}>
            <PlayCircle className="h-3 w-3 mr-1" />Run
          </Button>
        </div>
        {listStatus === "ok" && tools && (
          <div className="text-xs">
            <div className="text-emerald-500 mb-1">✓ Returned {tools.length} tool{tools.length === 1 ? "" : "s"}</div>
            <div className="flex flex-wrap gap-1">
              {tools.map((t) => (
                <code key={t.name} className="px-1.5 py-0.5 rounded bg-muted">{t.name}</code>
              ))}
            </div>
          </div>
        )}
        {listStatus === "err" && <div className="text-xs text-destructive">{listError}</div>}
      </div>

      {/* Test 2: example call */}
      <div className="space-y-3 rounded-md border border-border p-3">
        <div className="flex items-center gap-2">
          <StatusIcon s={callStatus} />
          <span className="text-sm font-medium">tools/call — example</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
          <div className="space-y-1.5">
            <Label className="text-xs">Tool</Label>
            <Select value={selectedTool} onValueChange={pickTool}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(EXAMPLE_CALLS).map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Arguments (JSON)</Label>
            <Input value={argsText} onChange={(e) => setArgsText(e.target.value)} className="font-mono text-xs" />
          </div>
        </div>
        <Button size="sm" onClick={runCall} disabled={callStatus === "loading"}>
          {callStatus === "loading" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <PlayCircle className="h-3 w-3 mr-1" />}
          Send request
        </Button>
        {callResult && (
          <div className="space-y-1">
            <Label className="text-xs">Response</Label>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-72 whitespace-pre-wrap break-words">{callResult}</pre>
          </div>
        )}
      </div>
    </Card>
  );
}
