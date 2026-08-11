import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AIPlatform, Message } from '@/types/chat';
import {
  ARTIFACT_PLATFORM, ROLE_LABEL, buildInstructions, extractArtifact,
  type ArtifactLang, type BuildRole,
} from '@/config/buildMode';
import {
  failureDigest, hasTests, proofOfWork, summarise, type TestReport,
} from '@/lib/buildHarness';
import { callPlatformRaw, type History } from '@/services/buildAgentService';
import { generateChatId } from '@/utils/chatUtils';

export interface ArtifactVersion {
  id: string;
  code: string;
  lang: ArtifactLang;
  author: string | null;
  role?: BuildRole | null;
  tests?: TestReport | null;
  created_at: string;
}

/** 'relay' = every enabled agent takes a turn, each building on the previous one. */
export type Builder = string;

/** How much of the compound-engineering pipeline to run. */
export type Rigor = 'compound' | 'fast';

export type VerifyFn = (code: string, lang: ArtifactLang) => Promise<TestReport | null>;

export const useBuildMode = (
  user: SupabaseUser | null,
  platforms: AIPlatform[],
  activeChatId: string | null,
  messages: Message[] | undefined,
  verify?: VerifyFn,
  /** Creates a conversation on the fly when the user starts straight in Build mode. */
  ensureChat?: () => Promise<string | null>,
) => {
  const queryClient = useQueryClient();
  const [builder, setBuilder] = useState<Builder>('relay');
  const [lang, setLang] = useState<ArtifactLang>('html');
  const [rigor, setRigor] = useState<Rigor>('compound');
  const langTouched = useRef(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [workingAgent, setWorkingAgent] = useState<string | null>(null);
  const [stage, setStage] = useState<BuildRole | null>(null);

  const buildAgents = useMemo(() => {
    const enabled = platforms.filter(p => p.enabled && (p.id !== 'local' || p.selectedModel));
    // Prefer agents with a verified key, but never end up with an empty queue
    // just because key detection hasn't resolved (keys live server-side).
    const keyed = enabled.filter(p => p.hasApiKey);
    return keyed.length > 0 ? keyed : enabled;
  }, [platforms]);

  /** Artifact revisions, oldest → newest. */
  const versions = useMemo<ArtifactVersion[]>(
    () =>
      (messages ?? [])
        .filter(m => m.platform === ARTIFACT_PLATFORM && typeof m.content === 'string')
        .map(m => {
          let code = m.content;
          let author: string | null = null;
          let vLang: ArtifactLang = 'html';
          let role: BuildRole | null = null;
          let tests: TestReport | null = null;
          try {
            const parsed = JSON.parse(m.content);
            if (parsed && typeof parsed.code === 'string') {
              code = parsed.code;
              vLang = parsed.lang === 'python' ? 'python' : 'html';
              author = parsed.author ?? null;
              role = parsed.role ?? null;
              tests = parsed.tests ?? null;
            } else if (parsed && typeof parsed.html === 'string') {
              // legacy payload — HTML only
              code = parsed.html;
              author = parsed.author ?? null;
            }
          } catch { /* legacy plain-HTML rows */ }
          return { id: m.id, code, lang: vLang, author, role, tests, created_at: m.created_at };
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
    async (
      row: { content: string; sender: 'user' | 'ai'; platform?: string },
      chatId: string | null = activeChatId,
    ) => {
      if (!chatId) return;
      const message: Message = {
        id: generateChatId(),
        conversation_id: chatId,
        created_at: new Date().toISOString(),
        attachments: [],
        ...row,
      };
      queryClient.setQueryData(['messages', chatId], (prev: Message[] | undefined) => [
        ...(prev ?? []),
        message,
      ]);
      const { error } = await supabase.from('messages').insert({
        id: message.id,
        conversation_id: chatId,
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

  /** One model call for one pipeline stage. Returns the produced code, if any. */
  const runStage = useCallback(
    async (
      platform: AIPlatform,
      role: BuildRole,
      request: string,
      currentCode: string | null,
      recent: Message[],
      extras: { plan?: string | null; harness?: string | null } = {},
      chatId: string | null = null,
    ): Promise<{ code: string | null; notes: string; replyLang: ArtifactLang }> => {
      const history: History = [
        {
          role: 'user',
          content: buildInstructions({
            agentName: platform.name, role, lang, currentCode,
            plan: extras.plan, harness: extras.harness,
          }),
        },
        ...recent.slice(-8).map(m => ({
          role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.sender === 'ai' && m.platform ? `[${m.platform}] ${m.content}` : m.content,
        })),
        { role: 'user', content: request },
      ];

      const reply = await callPlatformRaw(platform, history, user!);
      if (role === 'plan') {
        const plan = reply.replace(/```[\s\S]*?```/g, '').trim();
        await insertMessage({
          content: `**${ROLE_LABEL.plan} · ${platform.name}**\n\n${plan}`,
          sender: 'ai',
          platform: platform.id,
        }, chatId);
        return { code: null, notes: plan, replyLang: lang };
      }

      const { code, lang: replyLang, notes } = extractArtifact(reply, lang);
      const truncated = !code && (reply.match(/```/g)?.length ?? 0) % 2 === 1;
      await insertMessage({
        content: `**${ROLE_LABEL[role]} · ${platform.name}** — ${
          truncated
            ? 'the reply was cut off mid-code, so the artifact was left untouched. Ask for a smaller change, or switch to a model with a bigger output limit.'
            : notes || (code ? 'updated the artifact.' : reply)
        }`,
        sender: 'ai',
        platform: platform.id,
      }, chatId);
      return { code, notes, replyLang };
    },
    [insertMessage, lang, user],
  );

  /** Run the harness against a revision and post the proof of work. */
  const gate = useCallback(
    async (
      code: string,
      codeLang: ArtifactLang,
      author: string,
      role: BuildRole,
      chatId: string | null = null,
    ): Promise<TestReport | null> => {
      let report: TestReport | null = null;
      if (verify) {
        try {
          report = await verify(code, codeLang);
        } catch (e) {
          console.error('build mode: harness failed', e);
        }
      }

      await insertMessage({
        content: JSON.stringify({ code, lang: codeLang, author, role, tests: report }),
        sender: 'ai',
        platform: ARTIFACT_PLATFORM,
      }, chatId);

      if (report) {
        await insertMessage({ content: proofOfWork(report), sender: 'ai', platform: author }, chatId);
      } else if (!hasTests(code, codeLang)) {
        await insertMessage({
          content: '**QA gate — no tests found.** The artifact was not verified.',
          sender: 'ai',
          platform: author,
        }, chatId);
      }
      return report;
    },
    [insertMessage, verify],
  );

  const send = useCallback(
    async (prompt: string) => {
      const request = prompt.trim();
      if (!request || !user || isBuilding) return;

      // Starting in Build mode with no conversation yet — open one first.
      let chatId = activeChatId;
      if (!chatId && ensureChat) {
        try {
          chatId = await ensureChat();
        } catch (e) {
          console.error('build mode: could not create a conversation', e);
        }
      }
      if (!chatId) {
        toast.error('Start a chat first');
        return;
      }

      const queue =
        builder === 'relay'
          ? buildAgents
          : buildAgents.filter(p => p.id === builder);

      if (queue.length === 0) {
        toast.error('Enable at least one agent to build with');
        return;
      }

      setIsBuilding(true);
      await insertMessage({ content: request, sender: 'user' }, chatId);

      let currentCode = latest?.code ?? null;
      let currentLang: ArtifactLang = latest?.lang ?? lang;
      let report: TestReport | null = latest?.tests ?? null;
      const recent = transcript;
      const lead = queue[0];
      const qa = queue[queue.length - 1];
      const compound = rigor === 'compound';

      const step = async (
        platform: AIPlatform,
        role: BuildRole,
        extras: { plan?: string | null; harness?: string | null } = {},
      ) => {
        setWorkingAgent(platform.id);
        setStage(role);
        try {
          const out = await runStage(platform, role, request, currentCode, recent, extras, chatId);
          if (out.code) {
            currentCode = out.code;
            currentLang = out.replyLang;
            report = await gate(out.code, out.replyLang, platform.id, role, chatId);
          }
          return out;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          toast.error(`${platform.name}: ${msg}`);
          await insertMessage({
            content: `**${ROLE_LABEL[role]} · ${platform.name}** — could not finish this stage: ${msg}`,
            sender: 'ai',
            platform: platform.id,
          }, chatId);
          return { code: null, notes: '', replyLang: currentLang };
        }
      };

      const harnessBrief = () => {
        if (!report) return null;
        const digest = failureDigest(report);
        return `${summarise(report)}${digest ? `\n\nFailing:\n${digest}` : ''}`;
      };

      try {
        // 1. Orchestrate — the lead agent decomposes the work into criteria.
        let plan: string | null = null;
        if (compound) {
          const planned = await step(lead, 'plan', { harness: harnessBrief() });
          plan = planned.notes || null;
        }

        // 2. Implement — every agent in the relay iterates, tests included.
        for (const platform of queue) {
          await step(platform, 'implement', { plan, harness: harnessBrief() });
        }

        if (compound) {
          // 3. QA hardens the suite.
          await step(qa, 'test', { plan, harness: harnessBrief() });

          // 4. Review gate, with up to two repair rounds while red.
          await step(lead, 'review', { plan, harness: harnessBrief() });
          for (let round = 0; round < 2; round += 1) {
            if (!report || report.failed === 0) break;
            await step(qa, 'review', { plan, harness: harnessBrief() });
          }

          if (report?.failed) {
            await insertMessage({
              content: `⚠️ Shipped **red**: ${summarise(report)} after repair rounds. Latest failures are above.`,
              sender: 'ai',
              platform: lead.id,
            }, chatId);
          }
        }
      } finally {
        setWorkingAgent(null);
        setStage(null);
        setIsBuilding(false);
        queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
        queryClient.invalidateQueries({ queryKey: ['tokens'] });
      }
    },
    [activeChatId, builder, buildAgents, ensureChat, gate, insertMessage, isBuilding, lang, latest, queryClient, rigor, runStage, transcript, user],
  );

  /** Manual edits from the code editor become a new revision authored by the user. */
  const saveManualEdit = useCallback(
    async (code: string, editLang: ArtifactLang) => {
      if (!activeChatId || (code === latest?.code && editLang === latest?.lang)) return;
      await insertMessage({
        content: JSON.stringify({ code, lang: editLang, author: 'you', role: 'implement' }),
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
    rigor,
    setRigor,
    buildAgents,
    isBuilding,
    workingAgent,
    stage,
    versions,
    transcript,
    latest,
    send,
    saveManualEdit,
  };
};
