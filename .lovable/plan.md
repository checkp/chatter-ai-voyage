

## Plan: Tour for Existing Users, Auto Changelog, Mode-Aware Agent Prompts

### 1. Auto-launch guided tour for existing users

Currently the tour only runs when manually triggered via the compass button. The tour completion is stored in `localStorage` (`roboheard_tour_completed`).

**Change**: In `DesktopLayout.tsx`, auto-start the tour on mount if `tour.hasCompletedTour` is false. This means:
- New users see it after onboarding completes
- Existing users who never took the tour see it on next login
- Once completed, it never auto-launches again

**File**: `src/components/index/DesktopLayout.tsx` -- add a `useEffect` that calls `tour.startTour()` if `!tour.hasCompletedTour`.

### 2. Update changelog with latest features

Add a new entry (v2.3.0, dated 2026-04-11) covering recent additions:
- Live demo chat on landing page (real AI, no signup)
- Side-by-side hero layout with demo chat
- Guided tour for chat interface
- Mode-aware agent prompts

**File**: `src/data/changelog.ts` -- prepend new entry.

### 3. Auto-show "What's New" when changelog updates

Track the last-seen changelog version in `localStorage`. When the app loads and the latest version is newer than what the user last saw, auto-open the ChangelogDialog.

**Files**:
- `src/components/index/DesktopLayout.tsx` -- add state + effect to compare `localStorage` key `roboheard_last_seen_changelog` against `changelog[0].version`. If different, auto-open `ChangelogDialog`. On close, save the current version.
- Import `ChangelogDialog` and `changelog` into DesktopLayout.

### 4. Make agent prompts mode-aware (discussion vs conductor context)

Currently in `usePlatforms.ts`, the `contextMessage` injected as the first message only mentions isolated/side-by-side vs discussion mode. It has no awareness of conductor mode or conversation modes like free mode.

**Change in `src/hooks/usePlatforms.ts`** (`callAIAPI` function, lines ~285-300):
- Add a `conductor` chatMode branch: "You are {name} being orchestrated by a Conductor AI. Follow the conductor's instructions precisely. The conductor assigns you specific roles and tasks — stay in your lane and deliver focused answers."
- Enhance the discussion mode prompt to mention: "This is a live collaborative discussion. You and the other agents are having a real-time conversation. Build on ideas, respectfully disagree, and keep the dialogue flowing."
- For free mode (detected via messages or a flag), add context: "The agents are in free conversation mode — talking autonomously among themselves. Be natural, opinionated, and engaging."

Since free mode status isn't passed to `callAIAPI`, we'll add an optional `isFreeMode` parameter.

**Files**:
- `src/hooks/usePlatforms.ts` -- update `callAIAPI` signature and context messages
- `src/hooks/useSimpleDiscussion.ts`, `src/hooks/useDiscussion.ts`, `src/hooks/useFreeMode.ts` -- pass `isFreeMode` flag where applicable

### Technical Details

| File | Change |
|------|--------|
| `src/data/changelog.ts` | Add v2.3.0 entry |
| `src/components/index/DesktopLayout.tsx` | Auto-start tour for new users; auto-show changelog on version change |
| `src/hooks/usePlatforms.ts` | Add conductor/free-mode aware prompts to `callAIAPI` |
| `src/hooks/useSimpleDiscussion.ts` | Pass free mode context |
| `src/hooks/useDiscussion.ts` | Pass free mode context |
| `src/hooks/useFreeMode.ts` | Pass isFreeMode flag through callAIAPI |

