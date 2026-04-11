

## Plan: Side-by-Side Hero Layout with Demo Chat + Cooler Opening Lines

### Layout Change

Restructure the hero section into a two-column layout on desktop:
- **Left column**: The DemoChat widget (remove it from its current standalone position below hero)
- **Right column**: The RoboHeard logo image + badge + headline + CTA buttons
- **Mobile**: Stack vertically — hero text first, then demo chat below (same as current)

### File Changes

**`src/components/index/LandingPage.tsx`**
- Remove standalone `<DemoChat />` from below `<LandingHero />`
- Create a new flex container wrapping `<DemoChat />` (left) and `<LandingHero />` (right) side by side on `md:` breakpoint
- On mobile, hide demo chat here (desktop only) — mobile users go straight to hero + features

**`src/components/index/LandingHero.tsx`**
- Remove `text-center` and `mx-auto` centering — align text left on desktop
- Keep the image, badge, headline, description, and CTAs but left-aligned when in the two-column context
- Make it work both standalone (mobile) and as a right-column element (desktop)

**`src/components/index/DemoChat.tsx`**
- Update the 3 initial greeting messages to be more personalized and compelling:
  - GPT: Something warm and direct referencing the time of day, like "Welcome in. I'm GPT — ask me something wild and watch what happens."
  - Claude: Something thoughtful, like "I'm Claude. I tend to see angles others miss. Test me."
  - DeepSeek: Something edgy/technical, like "DeepSeek here. I dig deep where others skim. Let's go."
- Remove the outer heading/subheading ("Try it now — real AI, no signup") — the widget speaks for itself in the hero
- Adjust max-width to fill its column (`w-full` instead of `max-w-2xl mx-auto`)
- Remove the `my-12` margin since it'll be inside the hero flex container

### Visual Result (Desktop)

```text
+---------------------------+----------------------------+
|                           |                            |
|   [Demo Chat Widget]      |   [RoboHeard Logo]         |
|   GPT: Welcome in...      |   2026 — Agentic AI        |
|   Claude: I see angles..  |   Seven Frontier Models,   |
|   DeepSeek: Let's go.     |   One Conductor            |
|                           |                            |
|   [input field] [send]    |   [CTA Buttons]            |
|                           |                            |
+---------------------------+----------------------------+
```

### Files to Edit

| File | Change |
|------|--------|
| `src/components/index/LandingPage.tsx` | Two-column hero layout, remove standalone DemoChat |
| `src/components/index/LandingHero.tsx` | Left-align on desktop, responsive adjustments |
| `src/components/index/DemoChat.tsx` | Cooler opening lines, remove outer heading/margins, full-width |

