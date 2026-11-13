import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { IMAGE_PANEL_PLATFORM, type ImagePanelData } from '@/config/imageModels';
import type { Attachment } from '@/types/chat';

export type MediaKind = 'generated' | 'uploaded';

export interface MediaItem {
  id: string;
  kind: MediaKind;
  url: string;
  prompt?: string;
  name?: string;
  createdAt: string;
  chatId: string;
  model?: string;
}

export interface ChatMediaGroup {
  chatId: string;
  title: string;
  updatedAt: string;
  items: MediaItem[];
}

/** Item while it is being collected: `_fileName` is the storage path used to re-sign its URL. */
type MediaItemDraft = MediaItem & { _fileName?: string };

type DraftGroup = Omit<ChatMediaGroup, 'items'> & { items: MediaItemDraft[] };

const isImageAttachment = (a: unknown): a is Attachment => {
  if (!a || typeof a !== 'object') return false;
  const { mimeType, dataUrl } = a as Partial<Attachment>;
  return typeof mimeType === 'string' && mimeType.startsWith('image/') && typeof dataUrl === 'string';
};

export const useMediaGallery = (user: SupabaseUser | null) => {
  return useQuery<ChatMediaGroup[]>({
    queryKey: ['media-gallery', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      const [{ data: convs }, { data: msgs }, { data: gen }] = await Promise.all([
        supabase.from('conversations').select('id, title, updated_at, created_at').eq('user_id', user.id),
        supabase
          .from('messages')
          .select('id, conversation_id, sender, platform, content, attachments, created_at')
          .order('created_at', { ascending: true }),
        supabase.from('generated_images').select('*').eq('user_id', user.id),
      ]);

      const convMap = new Map<string, { title: string; updatedAt: string | null }>();
      (convs || []).forEach((c) =>
        convMap.set(c.id, { title: c.title || 'Untitled chat', updatedAt: c.updated_at || c.created_at }),
      );

      const groups = new Map<string, DraftGroup>();
      const ensure = (chatId: string) => {
        if (!groups.has(chatId)) {
          const meta = convMap.get(chatId);
          groups.set(chatId, {
            chatId,
            title: meta?.title || 'Untitled chat',
            updatedAt: meta?.updatedAt || new Date(0).toISOString(),
            items: [],
          });
        }
        return groups.get(chatId)!;
      };

      // Uploaded attachments + generated image panels from messages
      (msgs || []).forEach((m) => {
        if (!convMap.has(m.conversation_id)) return; // only user's chats
        const attachments: unknown = m.attachments;
        if (m.sender === 'user' && Array.isArray(attachments)) {
          attachments.filter(isImageAttachment).forEach((a, i) => {
            ensure(m.conversation_id).items.push({
              id: `${m.id}-att-${i}`,
              kind: 'uploaded',
              url: a.dataUrl,
              name: a.name,
              createdAt: m.created_at,
              chatId: m.conversation_id,
            });
          });
        }
        if (m.sender === 'ai' && m.platform === IMAGE_PANEL_PLATFORM && typeof m.content === 'string') {
          try {
            const data: ImagePanelData = JSON.parse(m.content);
            data.images?.forEach((img, i) => {
              if (img.success && (img.url || img.fileName)) {
                ensure(m.conversation_id).items.push({
                  id: `${m.id}-img-${i}`,
                  kind: 'generated',
                  url: img.url || '',
                  prompt: data.userPrompt || data.masterPrompt,
                  name: img.label,
                  model: img.model,
                  createdAt: m.created_at,
                  chatId: m.conversation_id,
                  // stash filename for re-signing below
                  ...(img.fileName ? { _fileName: img.fileName } : {}),
                });
              }
            });
          } catch {
            /* ignore */
          }
        }
      });

      // Legacy generated_images
      (gen || []).forEach((g) => {
        const chatId = '__standalone__';
        if (!groups.has(chatId)) {
          groups.set(chatId, {
            chatId,
            title: 'Standalone generations',
            updatedAt: g.created_at,
            items: [],
          });
        }
        const group = groups.get(chatId)!;
        if (group.items.some((it) => it._fileName === g.file_name)) return;
        group.items.push({
          id: `gen-${g.id}`,
          kind: 'generated',
          url: '',
          prompt: g.prompt,
          name: g.file_name,
          model: g.model_used,
          createdAt: g.created_at,
          chatId,
          _fileName: g.file_name,
        });
      });

      // Refresh signed URLs for all generated items that have a bucket path
      const extractPath = (u?: string) => {
        if (!u) return null;
        const m = u.match(/\/generated-images\/(.+?)(\?|$)/);
        return m ? decodeURIComponent(m[1]) : null;
      };
      const allItems: MediaItemDraft[] = [];
      groups.forEach((g) => allItems.push(...g.items));
      await Promise.all(
        allItems.map(async (it) => {
          if (it.kind !== 'generated') return;
          const path = it._fileName || extractPath(it.url);
          if (!path) return;
          const { data: signed } = await supabase.storage
            .from('generated-images')
            .createSignedUrl(path, 3600);
          if (signed?.signedUrl) it.url = signed.signedUrl;
        }),
      );

      return Array.from(groups.values())
        .map((g) => ({ ...g, items: g.items.filter((it) => !!it.url) }))
        .filter((g) => g.items.length > 0)
        .map((g) => ({
          ...g,
          items: g.items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
        }))
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    },
  });
};
