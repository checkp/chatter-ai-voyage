import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const ALL_TOOLS: { id: string; label: string; desc: string }[] = [
  { id: "list_models", label: "list_models", desc: "Discover available models & capabilities" },
  { id: "ask_model", label: "ask_model", desc: "Single-model prompt (+ think/search capabilities)" },
  { id: "web_search", label: "web_search", desc: "Perplexity live search with citations" },
  { id: "conductor_ask", label: "conductor_ask", desc: "Multi-model orchestration + synthesis" },
  { id: "conductor_route", label: "conductor_route", desc: "Plan only (cheap preview)" },
  { id: "conductor_compare", label: "conductor_compare", desc: "Raw side-by-side perspectives" },
  { id: "conductor_debate", label: "conductor_debate", desc: "Multi-round critique loop" },
  { id: "list_chats", label: "list_chats", desc: "List your recent conversations" },
  { id: "get_chat", label: "get_chat", desc: "Read one conversation's messages" },
  { id: "search_messages", label: "search_messages", desc: "Search across your chat history" },
];
// Mesh hub tools are machine-bridge protocol (ConductorAI nodes) — always enabled,
// never shown as toggles, and always preserved when settings are saved.
const HUB_TOOLS = ["hub_register", "hub_sync", "hub_send", "hub_messages", "hub_presence", "hub_ask", "hub_job"];


const ALL_PLATFORMS = ["openai", "anthropic", "google", "grok", "deepseek", "perplexity", "mistral", "qwen", "nvidia"] as const;
const WEB_MODELS = ["sonar", "sonar-pro", "sonar-reasoning", "sonar-reasoning-pro"];

type Settings = {
  enabled_tools: string[];
  enabled_platforms: string[];
  default_conductor_platform: string;
  default_web_search_model: string;
};

const DEFAULTS: Settings = {
  enabled_tools: ALL_TOOLS.map((t) => t.id),
  enabled_platforms: [...ALL_PLATFORMS],
  default_conductor_platform: "openai",
  default_web_search_model: "sonar-pro",
};

export default function McpSettingsCard() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const firstLoad = useRef(true);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;
      const { data } = await supabase
        .from("user_mcp_settings")
        .select("enabled_tools, enabled_platforms, default_conductor_platform, default_web_search_model")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      if (data) setSettings(data as Settings);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (firstLoad.current) { firstLoad.current = false; return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { setSaving(false); return; }
      const { error } = await supabase
        .from("user_mcp_settings")
        .upsert({ user_id: sess.session.user.id, ...settings }, { onConflict: "user_id" });
      setSaving(false);
      if (error) toast.error("Could not save MCP settings");
      else toast.success("MCP settings saved", { duration: 1500 });
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [settings, loading]);

  const toggleTool = (id: string, on: boolean) => {
    setSettings((s) => ({
      ...s,
      enabled_tools: on ? [...new Set([...s.enabled_tools, id])] : s.enabled_tools.filter((t) => t !== id),
    }));
  };
  const togglePlatform = (id: string, on: boolean) => {
    setSettings((s) => ({
      ...s,
      enabled_platforms: on ? [...new Set([...s.enabled_platforms, id])] : s.enabled_platforms.filter((t) => t !== id),
    }));
  };

  if (loading) {
    return <Card className="p-5 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading settings…</Card>;
  }

  return (
    <Card className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">MCP configuration</h2>
          <p className="text-xs text-muted-foreground">Choose which tools and models your coding agents can access. Auto-saves.</p>
        </div>
        {saving && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving</span>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tools exposed to agents</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {ALL_TOOLS.map((t) => (
            <label key={t.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/40">
              <div className="min-w-0">
                <div className="text-sm font-mono">{t.label}</div>
                <div className="text-xs text-muted-foreground">{t.desc}</div>
              </div>
              <Switch
                checked={settings.enabled_tools.includes(t.id)}
                onCheckedChange={(v) => toggleTool(t.id, v)}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Platforms available to conductor & ask_model</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ALL_PLATFORMS.map((p) => (
            <label key={p} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-muted/40">
              <span className="text-sm capitalize">{p}</span>
              <Switch
                checked={settings.enabled_platforms.includes(p)}
                onCheckedChange={(v) => togglePlatform(p, v)}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Default conductor platform</Label>
          <Select
            value={settings.default_conductor_platform}
            onValueChange={(v) => setSettings((s) => ({ ...s, default_conductor_platform: v }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {settings.enabled_platforms.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Default web-search model</Label>
          <Select
            value={settings.default_web_search_model}
            onValueChange={(v) => setSettings((s) => ({ ...s, default_web_search_model: v }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {WEB_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Changes apply immediately to the MCP server. Coding agents may need to re-list tools to see updates.
      </p>
    </Card>
  );
}
