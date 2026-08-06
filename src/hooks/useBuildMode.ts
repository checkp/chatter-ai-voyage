import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AIPlatform, Message } from '@/types/chat';
import {
  ARTIFACT_PLATFORM, buildInstructions, extractArtifact, type ArtifactLang,
} from '@/config/buildMode';
import { callPlatformRaw, type History } from '@/services/buildAgentService';
import { generateChatId } from '@/utils/chatUtils';

export interface ArtifactVersion {
  id: string;
  code: string;
  lang: ArtifactLang;
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
  const [lang, setLang] = useState<ArtifactLang>('html');
  const langTouched = useRef(false);
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
          let code = m.content;
          let author: string | null = null;
          let vLang: ArtifactLang = 'html';
          try {
            const parsed = JSON.parse(m.content);
            if (parsed && typeof parsed.code === 'string') {
              code = parsed.code;
              vLang = parsed.lang === 'python' ? 'python' : 'html';
              author = parsed.author ?? null;
            } else if (parsed && typeof parsed.html === 'string') {
              // legacy payload — HTML only
              code = parsed.html;
              author = parsed.author ?? null;
            }
          } catch { /* legacy plain-HTML rows */ }
          return { id: m.id, code, lang: vLang, author, created_at: m.created_at };
        }),
    [messages],
  );

  /** Chat transcript with artifact payloads stripped out. */
  const transcript = useMemo(
    () => (messages ?? []).filter(m => m.platform !== ARTIFACT_PLATFORM),
    [messages],
  );

  const latest = versions[versions.length - 1] ?? null;

  // Follow the artifact's own language until the human picks one explicitly.
  useEffect(() => {
    if (!langTouched.current && latest) setLang(latest.lang);
  }, [latest]);

  const chooseLang = useCallback((next: ArtifactLang) => {
    langTouched.current = true;
    setLang(next);
  }, []);

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
    async (platform: AIPlatform, request: string, currentCode: string | null, recent: Message[]) => {
      const history: History = [
        { role: 'user', content: buildInstructions(platform.name, currentCode, lang) },
        ...recent.slice(-8).map(m => ({
          role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.sender === 'ai' && m.platform ? `[${m.platform}] ${m.content}` : m.content,
        })),
        { role: 'user', content: request },
      ];

      const reply = await callPlatformRaw(platform, history, user!);
      const { code, lang: replyLang, notes } = extractArtifact(reply, lang);

      await insertMessage({
        content: notes || (code ? 'Updated the app.' : reply),
        sender: 'ai',
        platform: platform.id,
      });

      if (code) {
        await insertMessage({
          content: JSON.stringify({ code, lang: replyLang, author: platform.id }),
          sender: 'ai',
          platform: ARTIFACT_PLATFORM,
        });
      }
      return code;
    },
    [insertMessage, lang, user],
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

      let currentCode = latest?.code ?? null;
      const recent = transcript;

      try {
        for (const platform of queue) {
          setWorkingAgent(platform.id);
          try {
            const code = await runAgent(platform, request, currentCode, recent);
            if (code) currentCode = code;
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
    async (code: string, editLang: ArtifactLang) => {
      if (!activeChatId || (code === latest?.code && editLang === latest?.lang)) return;
      await insertMessage({
        content: JSON.stringify({ code, lang: editLang, author: 'you' }),
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
    lang,
    setLang: chooseLang,
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
