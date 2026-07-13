import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, ImageOff, Loader2, X } from 'lucide-react';
import { useMediaGallery, type MediaItem, type MediaKind } from '@/hooks/useMediaGallery';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SupabaseUser | null;
  onOpenChat?: (chatId: string) => void;
}

const MediaGalleryDialog: React.FC<Props> = ({ open, onOpenChange, user, onOpenChat }) => {
  const { data: groups, isLoading } = useMediaGallery(user);
  const [filter, setFilter] = useState<'all' | MediaKind>('all');
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<MediaItem | null>(null);

  const filtered = useMemo(() => {
    if (!groups) return [];
    const q = query.trim().toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => {
          if (filter !== 'all' && it.kind !== filter) return false;
          if (!q) return true;
          return (
            g.title.toLowerCase().includes(q) ||
            (it.prompt || '').toLowerCase().includes(q) ||
            (it.name || '').toLowerCase().includes(q)
          );
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, filter, query]);

  const totalCount = filtered.reduce((s, g) => s + g.items.length, 0);

  const handleOpenChat = (chatId: string) => {
    if (chatId === '__standalone__') return;
    onOpenChat?.(chatId);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[85vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle>Media Gallery</DialogTitle>
              <Badge variant="secondary">{totalCount} item{totalCount === 1 ? '' : 's'}</Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Search by chat, prompt, or filename..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1"
              />
              <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="generated">Generated</TabsTrigger>
                  <TabsTrigger value="uploaded">Uploaded</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading media...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ImageOff className="h-10 w-10 mb-3" />
                <p className="text-sm">No media found.</p>
                <p className="text-xs">Generated and uploaded images will appear here, grouped by chat.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {filtered.map((group) => (
                  <section key={group.chatId}>
                    <header className="flex items-center justify-between mb-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{group.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(group.updatedAt).toLocaleString()} · {group.items.length} item
                          {group.items.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      {group.chatId !== '__standalone__' && (
                        <Button variant="ghost" size="sm" onClick={() => handleOpenChat(group.chatId)}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Open chat
                        </Button>
                      )}
                    </header>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPreview(item)}
                          className="group relative aspect-square rounded-md overflow-hidden border border-border bg-muted hover:border-primary transition-colors"
                        >
                          <img
                            src={item.url}
                            alt={item.prompt || item.name || 'media'}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                          />
                          <Badge
                            variant={item.kind === 'generated' ? 'default' : 'secondary'}
                            className="absolute top-1 left-1 text-[10px] px-1.5 py-0"
                          >
                            {item.kind}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 overflow-hidden">
          {preview && (
            <div className="flex flex-col">
              <div className="bg-black/90 flex items-center justify-center max-h-[70vh]">
                <img src={preview.url} alt={preview.prompt || 'media'} className="max-h-[70vh] object-contain" />
              </div>
              <div className="p-4 space-y-2">
                {preview.prompt && <p className="text-sm">{preview.prompt}</p>}
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Badge variant={preview.kind === 'generated' ? 'default' : 'secondary'}>{preview.kind}</Badge>
                    {preview.model && <span>{preview.model}</span>}
                    <span>{new Date(preview.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <a href={preview.url} download={preview.name || 'image'} target="_blank" rel="noreferrer">
                        <Download className="h-3.5 w-3.5 mr-1" /> Download
                      </a>
                    </Button>
                    {preview.chatId !== '__standalone__' && (
                      <Button variant="outline" size="sm" onClick={() => handleOpenChat(preview.chatId)}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open chat
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MediaGalleryDialog;
