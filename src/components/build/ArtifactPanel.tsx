import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Download, ExternalLink, RotateCw, Save, Loader2, Smartphone, Monitor,
} from 'lucide-react';
import { STARTER_HTML } from '@/config/buildMode';
import type { ArtifactVersion } from '@/hooks/useBuildMode';
import type { AIPlatform } from '@/types/chat';

interface ArtifactPanelProps {
  versions: ArtifactVersion[];
  isBuilding: boolean;
  workingAgent: string | null;
  platforms: AIPlatform[];
  onSaveEdit: (html: string) => void;
}

const ArtifactPanel: React.FC<ArtifactPanelProps> = ({
  versions, isBuilding, workingAgent, platforms, onSaveEdit,
}) => {
  const [versionId, setVersionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [narrow, setNarrow] = useState(false);

  const latest = versions[versions.length - 1] ?? null;
  const selected = useMemo(
    () => versions.find(v => v.id === versionId) ?? latest,
    [versions, versionId, latest],
  );

  // Follow the newest revision unless the user pinned an older one.
  useEffect(() => {
    setVersionId(null);
    setDraft(null);
  }, [latest?.id]);

  const html = draft ?? selected?.html ?? STARTER_HTML;
  const agentName = (id: string | null) =>
    id === 'you' ? 'you' : platforms.find(p => p.id === id)?.name ?? id ?? 'agent';

  const download = () => {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roboheard-app.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const openInTab = () => {
    const win = window.open('', '_blank', 'noopener');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-secondary/30">
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground">Artifact</span>

        {versions.length > 0 && (
          <Select
            value={selected?.id ?? ''}
            onValueChange={(v) => { setVersionId(v); setDraft(null); }}
          >
            <SelectTrigger className="h-7 w-[190px] text-xs">
              <SelectValue placeholder="Version" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v, i) => (
                <SelectItem key={v.id} value={v.id} className="text-xs">
                  v{i + 1} · {agentName(v.author)}
                  {i === versions.length - 1 ? ' (latest)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isBuilding && (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Loader2 className="h-3 w-3 animate-spin" />
            {agentName(workingAgent)} building
          </Badge>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setNarrow(n => !n)} title={narrow ? 'Desktop width' : 'Mobile width'}>
            {narrow ? <Monitor className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setReloadKey(k => k + 1)} title="Reload preview">
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={openInTab} title="Open in new tab">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={download} title="Download HTML">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="preview" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-2 h-8 w-fit">
          <TabsTrigger value="preview" className="h-6 px-3 text-xs">Preview</TabsTrigger>
          <TabsTrigger value="code" className="h-6 px-3 text-xs">Code</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="m-0 min-h-0 flex-1 p-3 pt-2">
          <div className={`h-full ${narrow ? 'mx-auto w-[390px] max-w-full' : 'w-full'}`}>
            <iframe
              key={`${selected?.id ?? 'starter'}-${reloadKey}`}
              title="App preview"
              srcDoc={html}
              sandbox="allow-scripts allow-forms allow-modals allow-popups"
              className="h-full w-full rounded-md border border-border bg-white"
            />
          </div>
        </TabsContent>

        <TabsContent value="code" className="m-0 flex min-h-0 flex-1 flex-col gap-2 p-3 pt-2">
          <Textarea
            value={html}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none font-mono text-[11px] leading-relaxed"
          />
          <div className="flex items-center justify-end gap-2">
            {draft !== null && (
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Discard</Button>
            )}
            <Button size="sm" onClick={() => { onSaveEdit(html); setDraft(null); }} disabled={draft === null}>
              <Save className="mr-1.5 h-3.5 w-3.5" /> Save revision
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ArtifactPanel;
