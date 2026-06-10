import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeTheme, FUN_THEME_CAP, type FunTheme } from "@/lib/funTheme";
import type { Message } from "@/types/chat";

type ChatState = { enabled: boolean; theme: FunTheme | null; count: number };

type Ctx = {
  enabled: boolean;
  theme: FunTheme | null;
  toggle: () => void;
  notifyMessages: (messages: Message[] | undefined) => void;
  setActiveChat: (chatId: string | null) => void;
};

const FunThemeContext = createContext<Ctx | null>(null);

const storageKey = (chatId: string) => `fun-mode:${chatId}`;

function loadState(chatId: string | null): ChatState {
  if (!chatId) return { enabled: false, theme: null, count: 0 };
  try {
    const raw = localStorage.getItem(storageKey(chatId));
    if (!raw) return { enabled: false, theme: null, count: 0 };
    const parsed = JSON.parse(raw);
    return {
      enabled: !!parsed.enabled,
      theme: parsed.theme ?? null,
      count: typeof parsed.count === "number" ? parsed.count : 0,
    };
  } catch {
    return { enabled: false, theme: null, count: 0 };
  }
}

function saveState(chatId: string, state: ChatState) {
  try { localStorage.setItem(storageKey(chatId), JSON.stringify(state)); } catch { /* ignore */ }
}

export const FunThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
  const [state, setState] = useState<ChatState>({ enabled: false, theme: null, count: 0 });
  const inFlightRef = useRef(false);
  const lastAssistantIdRef = useRef<string | null>(null);

  const setActiveChat = useCallback((chatId: string | null) => {
    setActiveChatIdState(chatId);
    setState(loadState(chatId));
    lastAssistantIdRef.current = null;
  }, []);

  // Persist on change.
  useEffect(() => {
    if (activeChatId) saveState(activeChatId, state);
  }, [activeChatId, state]);

  const toggle = useCallback(() => {
    setState((s) => ({ ...s, enabled: !s.enabled }));
  }, []);

  const generate = useCallback(async (messages: Message[]) => {
    if (!activeChatId || inFlightRef.current) return;
    if (state.count >= FUN_THEME_CAP) return;
    inFlightRef.current = true;
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) return;
      const recent = messages.slice(-6).map((m) => ({ sender: m.sender, content: m.content }));
      const { data, error } = await supabase.functions.invoke("generate-fun-theme", {
        body: {
          recentMessages: recent,
          previousTheme: state.theme,
          round: state.count,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) { console.warn("fun theme error", error); return; }
      const theme = (data as any)?.theme as FunTheme | undefined;
      if (!theme) return;
      const safe = sanitizeTheme(theme);
      setState((s) => ({ ...s, theme: safe, count: s.count + 1 }));
    } catch (e) {
      console.warn("fun theme failed", e);
    } finally {
      inFlightRef.current = false;
    }
  }, [activeChatId, state.theme, state.count]);

  const notifyMessages = useCallback((messages: Message[] | undefined) => {
    if (!state.enabled || !activeChatId || !messages || messages.length === 0) return;
    // Find last assistant message
    let lastAi: Message | null = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === "ai") { lastAi = messages[i]; break; }
    }
    if (!lastAi) return;
    if (lastAi.id === lastAssistantIdRef.current) return;
    lastAssistantIdRef.current = lastAi.id;
    // Fire-and-forget
    void generate(messages);
  }, [state.enabled, activeChatId, generate]);

  const value = useMemo<Ctx>(() => ({
    enabled: state.enabled,
    theme: state.theme,
    toggle,
    notifyMessages,
    setActiveChat,
  }), [state.enabled, state.theme, toggle, notifyMessages, setActiveChat]);

  return <FunThemeContext.Provider value={value}>{children}</FunThemeContext.Provider>;
};

export function useFunTheme(): Ctx {
  const ctx = useContext(FunThemeContext);
  if (!ctx) {
    // Safe no-op default if used outside provider.
    return {
      enabled: false,
      theme: null,
      toggle: () => {},
      notifyMessages: () => {},
      setActiveChat: () => {},
    };
  }
  return ctx;
}
