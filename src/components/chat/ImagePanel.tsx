import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sparkles, ChevronDown, Download, AlertCircle } from 'lucide-react';
import type { ImagePanelData } from '@/config/imageModels';

interface Props { data: ImagePanelData }

const ImagePanel: React.FC<Props> = ({ data }) => {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [showProposals, setShowProposals] = useState(false);

  return (
    <div className="w-full max-w-4xl bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" />
        Multi-Agent Image Generation
      </div>

      {/* Master prompt */}
      <div className="bg-muted/40 rounded-md p-3 border border-border">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Master prompt (Conductor)</div>
        <div className="text-sm italic">{data.masterPrompt}</div>
      </div>

      {/* Proposals collapsible */}
      <Collapsible open={showProposals} onOpenChange={setShowProposals}>
        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className={`h-3 w-3 transition-transform ${showProposals ? 'rotate-180' : ''}`} />
          {showProposals ? 'Hide' : 'Show'} {data.proposals.length} agent proposals
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-1.5">
          {data.proposals.map(p => (
            <div key={p.agent} className="text-xs flex gap-2 p-2 rounded bg-muted/30">
              <span className="font-semibold min-w-[80px]">{p.name}:</span>
              <span className="text-muted-foreground">{p.proposal || p.error || '—'}</span>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Image grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {data.images.map(img => (
          <div key={img.model} className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{img.label}</span>
              <span className="text-muted-foreground font-mono">{img.cost}t</span>
            </div>
            {img.success && img.url ? (
              <button
                onClick={() => setLightbox(img.url!)}
                className="block w-full aspect-square rounded-md overflow-hidden border border-border hover:border-primary transition-colors group"
              >
                <img
                  src={img.url}
                  alt={img.label}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                  loading="lazy"
                />
              </button>
            ) : (
              <div className="aspect-square rounded-md border border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center text-xs text-destructive p-3 text-center">
                <AlertCircle className="h-5 w-5 mb-1" />
                <span>Failed</span>
                {img.error && <span className="mt-1 text-[10px] opacity-70 line-clamp-3">{img.error}</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-5xl p-2">
          {lightbox && (
            <div className="flex flex-col gap-2">
              <img src={lightbox} alt="Full size" className="w-full max-h-[80vh] object-contain rounded" />
              <a
                href={lightbox}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 self-end text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90"
              >
                <Download className="h-4 w-4" /> Download
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImagePanel;
