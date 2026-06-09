## Problem

New chats stay titled "New Chat" forever. Searching the codebase confirms there's no auto-rename logic — `createChatMutation` inserts `title: 'New Chat'` and nothing ever updates it (no `updateChatTitle`/title-update call exists in any hook or service).

## Plan

Add automatic chat renaming based on the first user message.

### Behavior
- When a user sends a message into a chat whose title is still the default (`"New Chat"` — and not a Conductor chat, which uses `Conductor: …`), derive a title from that first message:
  - Strip newlines/extra whitespace.
  - Truncate to ~50 chars, appending `…` if cut.
  - Empty fallback: keep `"New Chat"`.
- Update the title once, only if current title equals `"New Chat"` (so user-renamed chats and Conductor chats are untouched).
- Update both the DB (`conversations.title`) and the local React Query cache so the sidebar reflects it immediately.

### Where the change lands
- `src/hooks/useChatManagement.ts` — add a small `renameChatIfDefault(chatId, firstMessage)` mutation/helper that:
  - `UPDATE conversations SET title = $new WHERE id = $chatId AND user_id = $uid AND title = 'New Chat'`
  - invalidates / patches the `chats` query cache.
- `src/hooks/useMessageHandling.ts` (and the conductor send path if it shares a different entry) — right after the user message is persisted in `handleSend`, call the rename helper when the chat's current title is `"New Chat"`.

### Out of scope
- No DB schema/migration changes (column already exists).
- No change to Conductor titles or to chats the user has manually renamed.
- No AI-generated summarization of the title (just trimmed first message); can be a follow-up if you want smarter titles.
