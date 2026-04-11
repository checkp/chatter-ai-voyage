

## Plan: Add Interactive Demo Chat on Landing Page

### Concept
A small embedded chat widget on the landing page where visitors can type a message and see simulated multi-AI responses (from GPT, Claude, DeepSeek). After the user sends their 2nd message (3rd total send = user's 2nd), they get redirected to auth with their demo conversation preserved via localStorage so it loads into their first real chat.

### New Files

**`src/components/index/DemoChat.tsx`**
- A compact chat window component (~400px tall) styled like a mini version of the main chat
- Shows agent avatars/names with colored badges (GPT, Claude, DeepSeek)
- Pre-seeded with a welcome message from each agent greeting the user
- Text input at the bottom with send button
- On first user message: fire real API calls to 3 agents (using the existing edge functions but without auth -- OR use pre-canned simulated responses that type out with a streaming animation)
- On second user message: show a "Sign up to continue this conversation" overlay, redirect to `/auth`
- Save the conversation to `localStorage` under a key like `demo_conversation`

**Decision: Real API vs Simulated responses**
- Real API calls require auth tokens -- won't work for anonymous users
- Better approach: **pre-scripted typewriter responses** for the demo. Each agent has 2-3 canned responses per common topic. If the user's message doesn't match, use generic "great question" responses. This is zero-cost and instant.

### Changes to Existing Files

**`src/components/index/LandingPage.tsx`**
- Import and render `<DemoChat />` between `LandingHero` and `ConductorShowcase`
- Add a heading like "Try it now -- no signup needed"

**`src/components/AuthPage.tsx`**
- After successful auth redirect, check for `demo_conversation` in localStorage
- If present, pass it via URL state or keep in localStorage for Index to pick up

**`src/pages/Index.tsx`**
- After auth, check `localStorage` for `demo_conversation`
- If found, create a new chat and seed it with those messages, then clear localStorage

### DemoChat Component Details

```text
+------------------------------------------+
|  Try RoboHeard -- Live Demo              |
+------------------------------------------+
| 🤖 GPT: Hey! Ask us anything.           |
| 🎭 Claude: We're ready to collaborate.  |
| 🔍 DeepSeek: Fire away!                 |
|                                          |
| [User]: What's the best programming     |
|         language for AI?                 |
|                                          |
| 🤖 GPT: Python dominates for ML...      |
| 🎭 Claude: I'd add that Rust is...      |
| 🔍 DeepSeek: From a research angle...   |
+------------------------------------------+
| [Type a message...]          [Send]      |
+------------------------------------------+
```

- Typewriter effect for agent responses (30ms per char)
- Track `sendCount` state -- on 2nd user send, show signup CTA overlay
- Store messages in state as `{sender, content, platform}[]`
- Save to `localStorage('demo_conversation')` on redirect

### Conversation Preservation Flow

1. User sends 2 messages in demo
2. Demo saves messages to `localStorage`
3. Redirect to `/auth`
4. After auth success, Index.tsx checks localStorage
5. Creates a new chat, inserts demo messages via Supabase
6. Clears localStorage key
7. User lands in main chat with their demo conversation intact

### Files to Create/Edit

| File | Action |
|------|--------|
| `src/components/index/DemoChat.tsx` | Create -- demo chat widget |
| `src/components/index/LandingPage.tsx` | Edit -- add DemoChat section |
| `src/pages/Index.tsx` | Edit -- hydrate demo conversation after auth |

