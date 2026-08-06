import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AIPlatform, Message } from '@/types/chat';
import { ARTIFACT_PLATFORM, buildInstructions, extractArtifact } from '@/config/buildMode';
import { callPlatformRaw, type History } from '@/services/buildAgentService';
import { generateChatId } from '@/utils/chatUtils';

export interface ArtifactVersion {
  id: string;
  html: string;
  author: string | null;
  created_at: string;
}

/** 'relay' = every enabled agent takes a turn, each building on the previous one. */
export type Builder = string;

export const useBuildMode = (
  user: SupabaseUser | null,
  platforms: AIPlatform[],
  activeChatId: string | null,
  messages: Message[] | undefined,
) => {
  const queryClient = useQueryClient();
  const [builder, setBuilder] = useState<Builder>('relay');
  const [isBuilding, setIsBuilding] = useState(false);
  const [workingAgent, setWorkingAgent] = useState<string | null>(null);

  const buildAgents = useMemo(
    () => platforms.filter(p => p.enabled && p.hasApiKey && (p.id !== 'local' || p.selectedModel)),
    [platforms],
  );

  /** Artifact revisions, oldest → newest. */
  const versions = useMemo<ArtifactVersion[]>(
    () =>
      (messages ?? [])
        .filter(m => m.platform === ARTIFACT_PLATFORM && typeof m.content === 'string')
        .map(m => {
          let html = m.content;
          let author: string | null = null;
          try {
            const parsed = JSON.parse(m.content);
            if (parsed && typeof parsed.html === 'string') {
              html = parsed.html;
              author = parsed.author ?? null;
            }
          } catch { /* legacy plain-HTML rows */ }
          return { id: m.id, html, author, created_at: m.created_at };
        }),
    [messages],
  );

  /** Chat transcript with artifact payloads stripped out. */
  const transcript = useMemo(
    () => (messages ?? []).filter(m => m.platform !== ARTIFACT_PLATFORM),
    [messages],
  );

  const latest = versions[versions.length - 1] ?? null;

  const insertMessage = useCallback(
    async (row: { content: string; sender: 'user' | 'ai'; platform?: string }) => {
      if (!activeChatId) return;
      const message: Message = {
        id: generateChatId(),
        conversation_id: activeChatId,
        created_at: new Date().toISOString(),
        attachments: [],
        ...row,
      };
      queryClient.setQueryData(['messages', activeChatId], (prev: Message[] | undefined) => [
        ...(prev ?? []),
        message,
      ]);
      const { error } = await supabase.from('messages').insert({
        id: message.id,
        conversation_id: activeChatId,
        content: message.content,
        sender: message.sender,
        platform: message.platform ?? null,
        created_at: message.created_at,
        attachments: [],
      });
      if (error) console.error('build mode: could not persist message', error);
    },
    [activeChatId, queryClient],
  );

  const runAgent = useCallback(
    async (platform: AIPlatform, request: string, currentHtml: string | null, recent: Message[]) => {
      const history: History = [
        { role: 'user', content: buildInstructions(platform.name, currentHtml) },
        ...recent.slice(-8).map(m => ({
          role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.sender === 'ai' && m.platform ? `[${m.platform}] ${m.content}` : m.content,
        })),
        { role: 'user', content: request },
      ];

      const reply = await callPlatformRaw(platform, history, user!);
      const { html, notes } = extractArtifact(reply);

      await insertMessage({
        content: notes || (html ? 'Updated the app.' : reply),
        sender: 'ai',
        platform: platform.id,
      });

      if (html) {
        await insertMessage({
          content: JSON.stringify({ html, author: platform.id }),
          sender: 'ai',
          platform: ARTIFACT_PLATFORM,
        });
      }
      return html;
    },
    [insertMessage, user],
  );

  const send = useCallback(
    async (prompt: string) => {
      const request = prompt.trim();
      if (!request || !activeChatId || !user || isBuilding) return;

      const queue =
        builder === 'relay'
          ? buildAgents
          : buildAgents.filter(p => p.id === builder);

      if (queue.length === 0) {
        toast.error('Enable at least one agent to build with');
        return;
      }

      setIsBuilding(true);
      await insertMessage({ content: request, sender: 'user' });

      let currentHtml = latest?.html ?? null;
      const recent = transcript;

      try {
        for (const platform of queue) {
          setWorkingAgent(platform.id);
          try {
            const html = await runAgent(platform, request, currentHtml, recent);
            if (html) currentHtml = html;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            toast.error(`${platform.name}: ${msg}`);
            await insertMessage({
              content: `Could not build this round — ${msg}`,
              sender: 'ai',
              platform: platform.id,
            });
          }
        }
      } finally {
        setWorkingAgent(null);
        setIsBuilding(false);
        queryClient.invalidateQueries({ queryKey: ['messages', activeChatId] });
        queryClient.invalidateQueries({ queryKey: ['tokens'] });
      }
    },
    [activeChatId, builder, buildAgents, insertMessage, isBuilding, latest, queryClient, runAgent, transcript, user],
  );

  /** Manual edits from the code editor become a new revision authored by the user. */
  const saveManualEdit = useCallback(
    async (html: string) => {
      if (!activeChatId || html === latest?.html) return;
      await insertMessage({
        content: JSON.stringify({ html, author: 'you' }),
        sender: 'ai',
        platform: ARTIFACT_PLATFORM,
      });
      queryClient.invalidateQueries({ queryKey: ['messages', activeChatId] });
      toast.success('Saved a new revision', { duration: 2000 });
    },
    [activeChatId, insertMessage, latest, queryClient],
  );

  return {
    builder,
    setBuilder,
    buildAgents,
    isBuilding,
    workingAgent,
    versions,
    transcript,
    latest,
    send,
    saveManualEdit,
  };
};
