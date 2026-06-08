import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { IMAGE_MODEL_OPTIONS, PROMPT_COLLAB_COST } from '@/config/imageModels';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPrompt: string;
  onConfirm: (selectedModels: string[]) => void;
}

const ImageModelPicker: React.FC<Props> = ({ open, onOpenChange, userPrompt, onConfirm }) => {
  const { user } = useAuth();
  const { tokenBalance } = useTokenBalance(user);
  const [selected, setSelected] = useState<string[]>(['gemini-image']);

  const toggle = (id: string) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const imageCost = selected.reduce((sum, id) => {
    const m = IMAGE_MODEL_OPTIONS.find(x => x.id === id);
    return sum + (m?.cost ?? 0);
  }, 0);
  const total = imageCost + PROMPT_COLLAB_COST;
  const insufficient = (tokenBalance ?? 0) < total;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Multi-Agent Image Generation
          </DialogTitle>
          <DialogDescription>
            7 AI agents will collaborate on a master prompt, then your selected models will each render an image.
          </DialogDescription>
        </DialogHeader>

        {userPrompt && (
          <div className="text-sm bg-muted/40 p-3 rounded-md border border-border">
            <div className="text-xs text-muted-foreground mb-1">Your request</div>
            <div className="line-clamp-3">{userPrompt}</div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Pick image models</div>
          {IMAGE_MODEL_OPTIONS.map(m => (
            <label
              key={m.id}
              className="flex items-center justify-between gap-3 p-3 rounded-md border border-border hover:bg-muted/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selected.includes(m.id)}
                  onCheckedChange={() => toggle(m.id)}
                />
                <div>
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="text-xs text-muted-foreground">{m.provider} · {m.description}</div>
                </div>
              </div>
              <div className="text-sm font-mono text-muted-foreground">{m.cost}t</div>
            </label>
          ))}
        </div>

        <div className="text-sm space-y-1 border-t border-border pt-3">
          <div className="flex justify-between text-muted-foreground">
            <span>Prompt collaboration (7 agents + Conductor)</span>
            <span className="font-mono">{PROMPT_COLLAB_COST}t</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Image generation</span>
            <span className="font-mono">{imageCost}t</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span className="font-mono">{total}t</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Your balance</span>
            <span className="font-mono">{tokenBalance ?? '…'}t</span>
          </div>
          {insufficient && (
            <div className="text-xs text-destructive">Insufficient tokens.</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => { onConfirm(selected); onOpenChange(false); }}
            disabled={selected.length === 0 || insufficient}
          >
            Generate {selected.length} image{selected.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageModelPicker;
